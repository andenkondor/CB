import { Component } from '@angular/core';
import { LexerService } from './services/lexer.service';
import { ParserService } from './services/parser.service';
import { ASTNode } from './Models/ASTNode'
import { SemanticAnalyzerService } from './services/semanticAnalyzer.service';
import { JSONMapperService } from './services/JSONMapper.service';
import { DataSet, Network } from 'vis';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})


export class AppComponent {
  title = 'app';
  srcText: string = "";
  targetText = "";
  consoleText = "";
  showTokens = true;
  tokenAutoFix = false;
  lookaheadSize = 2;
  showAST = true;
  showGraphicAST = true;

  constructor(public lexerService: LexerService, public parserService: ParserService, public semanticAnalyzerService: SemanticAnalyzerService,
    public JSONMapperService: JSONMapperService) { }


  //Jegliche Textfenster auf leeren String setzen
  resetInputs() {
    this.srcText = "";
    this.targetText = "";
    this.consoleText = "";
  }

  //Sorgt dafür, dass nicht konvertiert werden kann, wenn kein Ausgangstext
  convertDisabled() {
    var disabled = false;

    if (this.srcText === "") {
      disabled = true;
    }


    return disabled;
  }

  //Konvertierungsroutine: Sequentieller Aufruf aller Services
  convert() {
    this.consoleText = "";
    this.targetText = "";
    var startTime = new Date();
    var tokens = this.lexing(startTime);
    if (tokens) {
      var tree = this.parsing(startTime, tokens);

      if (tree) {
        var result = this.analyzing(startTime, tree);
      }

      if (result) {
        var JSONtext = this.mapping(startTime, tree);
        if (JSONtext) {
          this.targetText = JSONtext;
        }

      }
    }
  }

  //Grafische Ausgabe des Parse-Trees mit vis.js erstellen
  drawGraphicalTree(tree: ASTNode) {
    if (!this.showGraphicAST) {
      return;
    }
    var nodesArray = [];
    var edgesArray = [];

    var result = tree.getGraphic(nodesArray, edgesArray);

    var nodes = new DataSet(result[0]);
    var edges = new DataSet(result[1]);


    var container = document.getElementById('mynetwork');
    var data = {
      nodes: nodes,
      edges: edges
    };
    var options = {
      layout: {
        improvedLayout: true,
        hierarchical: {
          direction: "UD",
          nodeSpacing: 200
        }
      },
      edges: {
        arrows: {
          to: true
        }
      }
    };
    var network = new Network(container, data, options);

  }



  //Aufruf des LexerService
  //Verarbeitung und Darstellung der Ergebnisse für Nutzer
  lexing(startTime) {
    this.appendConsole("0.000s - Start Lexing ...");
    this.lexerService.initialize(this.srcText, this.tokenAutoFix);
    var result = this.lexerService.getTokens();
    var afterLexingTime = new Date();
    var lexingDuration = afterLexingTime.getMilliseconds() - startTime.getMilliseconds();
    lexingDuration /= 1000;

    if (result[1] === "success") {
      this.appendConsole(lexingDuration + "s - Lexing succeeded!")
      if (this.showTokens) {
        this.appendConsole("Found following Tokens: ");
        for (var token in result[0]) {
          if (result[0][token].value === "") {
            this.appendConsole("\t<" + result[0][token].name + ", ->");
          } else {
            this.appendConsole("\t<" + result[0][token].name + ", " + result[0][token].value + ">");
          }
        }
      }
      return result[0];
    } else if (result[1] === "failure") {
      this.appendConsole(lexingDuration + "s - Lexing failed!");
      this.appendConsole("Cannot assign Token at line " + result[3] + " and index " + result[4] + ":");
      this.appendConsole("\t" + result[2]);
      return null;


    }
  }

  //Aufruf des ParserService
  //Verarbeitung und Darstellung der Ergebnisse für Nutzer
  parsing(startTime, tokens) {
    var lexingTime = new Date().getMilliseconds() - startTime.getMilliseconds();
    lexingTime /= 1000;
    this.appendConsole(lexingTime + "s - Start Parsing ...");
    this.parserService.initialize(tokens, this.lookaheadSize);
    var result = this.parserService.parsing();
    var afterParsingTime = new Date().getMilliseconds() - startTime.getMilliseconds();
    afterParsingTime /= 1000;
    if (result[1] === "success") {
      this.appendConsole(afterParsingTime + "s - Parsing succeeded!");
      var tree: ASTNode = result[0];
      this.drawGraphicalTree(tree);
      if (this.showAST) {
        this.appendConsole("AST:");
        this.appendConsole(tree.draw());
      }
      return tree;
    } else if (result[0] === "failure") {
      this.appendConsole(afterParsingTime + "s - Parsing failed!");
      if (result[2][0].name != "NULL") {
        if (result[2][1].value != "") {
          this.appendConsole("Expected " + result[2][0] + ", but received " + result[2][1].name + " '" + result[2][1].value + "':");
        } else {
          this.appendConsole("Expected " + result[2][0] + ", but received " + result[2][1].name + ":");
        }
        var lines = this.srcText.split("\n");
        this.appendConsole("at line " + result[2][1].line + " and index " + result[2][1].index);
        var errorPosition = lines[result[2][1].line - 1].substr(0, result[2][1].index - 1) + "[ERROR->]" + lines[result[2][1].line - 1].substr(result[2][1].index - 1);
        this.appendConsole(errorPosition);

      } else {
        this.appendConsole("Expected " + result[2][0] + ", but no more Tokens left");
      }
      return null;


    }

  }
  //Aufruf des SemanticAnalyzerService
  //Verarbeitung und Darstellung der Ergebnisse für Nutzer
  analyzing(startTime, tree) {
    var analyzingTime = new Date().getMilliseconds() - startTime.getMilliseconds();
    analyzingTime /= 1000;

    this.appendConsole(analyzingTime + "s - Starting Semantic Analysis ...");
    this.semanticAnalyzerService.initialize(tree);
    var result = this.semanticAnalyzerService.analyze();
    var afterAnalyzationTime = new Date().getMilliseconds() - startTime.getMilliseconds();
    afterAnalyzationTime /= 1000;

    if (result[0] === "success") {
      this.appendConsole(afterAnalyzationTime + "s - Semantic Analysis succeeded!");

      return result;

    } else if (result[0] === "failure") {
      this.appendConsole(afterAnalyzationTime + "s - Semantic Analysis failed!");

      result.shift();

      for (var error in result) {
        var errorNumber = parseInt(error) + 1;
        this.appendConsole("Error " + errorNumber + ": " + result[error]);
      }
      return null;

    }
  }

  //Aufruf des JSONMapperService
  //Verarbeitung und Darstellung der Ergebnisse für Nutzer
  mapping(startTime, tree) {
    var mappingTime = new Date().getMilliseconds() - startTime.getMilliseconds();
    mappingTime /= 1000;

    this.appendConsole(mappingTime + "s - Starting Mapping to JSON ...");
    this.JSONMapperService.initialize(tree);
    var result = this.JSONMapperService.map();
    var afterMappingTime = new Date().getMilliseconds() - startTime.getMilliseconds();
    afterMappingTime /= 1000;
    this.appendConsole(afterMappingTime + "s - Mapping to JSON succeeded!");
    return result;


  }

  //Hilfsfunktion, um das Konsolenfenster um eine Zeile zu erweitern
  appendConsole(text) {
    this.consoleText += text + "\n";
  }


}