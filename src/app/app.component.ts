import { Component } from '@angular/core';
import { LexerService } from './services/lexer.service';

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

  constructor(public lexerService: LexerService) { }



  resetInputs() {
    this.srcText = "";
    this.targetText = "";
    this.consoleText = "";
  }

  convertDisabled() {
    var disabled = false;

    if (this.srcText === "") {
      disabled = true;
    }

    return disabled;
  }



  convert() {
    this.consoleText = "";
    this.targetText = "";
    var startTime = new Date();
    var tokens = this.lexing(startTime);
    

  }

  lexing(startTime){
    this.appendConsole("0.000s - Start Lexing ...");
    this.lexerService.initialize(this.srcText, this.tokenAutoFix);
    var result = this.lexerService.getTokens();
    var afterLexingTime = new Date();
    var lexingDuration = afterLexingTime.getMilliseconds() - startTime.getMilliseconds();
    lexingDuration /= 1000;

    if (result[1] === "success") {
      this.appendConsole(lexingDuration+"s - Lexing succeeded!")
      if (this.showTokens) {
        this.appendConsole("Found following Tokens: ");
        for (var token in result[0]) {
          if(result[0][token].value === ""){
          this.appendConsole("\t<" + result[0][token].name+", ->");
          }else{
            this.appendConsole("\t<" + result[0][token].name+", "+result[0][token].value+">");
          }
        }
      }
      return result[0];
    }else if(result[1] === "failure"){
      this.appendConsole(lexingDuration+"s - Lexing failed!")
      this.appendConsole("Cannot assign Token at line "+result[3]+" and index "+result[4]+":");
      this.appendConsole("\t"+result[2]);
      return null;
      
      
    }
  }

  appendConsole(text) {
    this.consoleText += text + "\n";
  }


}