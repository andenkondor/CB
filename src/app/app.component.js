"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var core_1 = require('@angular/core');
var AppComponent = (function () {
    function AppComponent(lexerService, parserService) {
        this.lexerService = lexerService;
        this.parserService = parserService;
        this.title = 'app';
        this.srcText = "";
        this.targetText = "";
        this.consoleText = "";
        this.showTokens = true;
        this.tokenAutoFix = false;
        this.lookaheadSize = 3;
        this.showAST = true;
    }
    AppComponent.prototype.resetInputs = function () {
        this.srcText = "";
        this.targetText = "";
        this.consoleText = "";
    };
    AppComponent.prototype.convertDisabled = function () {
        var disabled = false;
        if (this.srcText === "") {
            disabled = true;
        }
        return disabled;
    };
    AppComponent.prototype.convert = function () {
        this.consoleText = "";
        this.targetText = "";
        var startTime = new Date();
        var tokens = this.lexing(startTime);
        var tree = this.parsing(startTime, tokens);
    };
    AppComponent.prototype.lexing = function (startTime) {
        this.appendConsole("0.000s - Start Lexing ...");
        this.lexerService.initialize(this.srcText, this.tokenAutoFix);
        var result = this.lexerService.getTokens();
        var afterLexingTime = new Date();
        var lexingDuration = afterLexingTime.getMilliseconds() - startTime.getMilliseconds();
        lexingDuration /= 1000;
        if (result[1] === "success") {
            this.appendConsole(lexingDuration + "s - Lexing succeeded!");
            if (this.showTokens) {
                this.appendConsole("Found following Tokens: ");
                for (var token in result[0]) {
                    if (result[0][token].value === "") {
                        this.appendConsole("\t<" + result[0][token].name + ", ->");
                    }
                    else {
                        this.appendConsole("\t<" + result[0][token].name + ", " + result[0][token].value + ">");
                    }
                }
            }
            return result[0];
        }
        else if (result[1] === "failure") {
            this.appendConsole(lexingDuration + "s - Lexing failed!");
            this.appendConsole("Cannot assign Token at line " + result[3] + " and index " + result[4] + ":");
            this.appendConsole("\t" + result[2]);
            return null;
        }
    };
    AppComponent.prototype.parsing = function (startTime, tokens) {
        var lexingTime = new Date().getMilliseconds() - startTime.getMilliseconds();
        lexingTime /= 1000;
        this.appendConsole(lexingTime + "s - Start Parsing ...");
        this.parserService.initialize(tokens, this.lookaheadSize);
        var result = this.parserService.parsing();
        var afterParsingTime = new Date().getMilliseconds() - startTime.getMilliseconds();
        afterParsingTime /= 1000;
        if (result[1] === "success") {
            this.appendConsole(afterParsingTime + "s - Parsing succeeded!");
            if (this.showAST) {
                var tree = result[0];
                this.appendConsole("AST:");
                this.appendConsole(tree.draw());
            }
            return tree;
        }
        else if (result[1] === "failure") {
            this.appendConsole(afterParsingTime + "s - Parsing failed!");
            return null;
        }
    };
    AppComponent.prototype.appendConsole = function (text) {
        this.consoleText += text + "\n";
    };
    AppComponent = __decorate([
        core_1.Component({
            selector: 'app-root',
            templateUrl: './app.component.html',
            styleUrls: ['./app.component.css']
        })
    ], AppComponent);
    return AppComponent;
}());
exports.AppComponent = AppComponent;
