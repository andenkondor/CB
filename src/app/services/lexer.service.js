"use strict";
var token_1 = require('../models/token');
var LexerService = (function () {
    function LexerService() {
        this.src = "";
        this.initialSrc = "";
        this.tokens = [];
        this.fragLetter = "[A-Za-z_]";
        this.fragDecimalDigit = "[0-9]";
        this.fragOctalDigit = "[0-7]";
        this.fragHexDigit = "[0-9A-Fa-f]";
        this.fragDecimalLiteral = "[1-9]" + this.fragDecimalDigit + "*";
        this.fragOctalLiteral = "0" + this.fragOctalDigit + "*";
        this.fragHexLiteral = "0(x|X)" + this.fragHexDigit + "*";
        this.fragDecimals = this.fragDecimalDigit + "+";
        this.fragExponent = "(e|E)(\\+|-)?" + this.fragDecimals;
        this.fragHexEscape = "\\\\(x|X)" + this.fragHexDigit + "{2}";
        this.fragOctalEscape = "\\\\" + this.fragOctalDigit + "{3}";
        this.fragCharEscape = "\\\\[abfnrtv\\'\"]";
        this.fragCharValue = "(" + this.fragHexEscape + "|" + this.fragOctalEscape + "|" + this.fragCharEscape + "|[^\\0\\n\\\\])";
        this.lexerGrammar = {
            BOOL: "bool",
            BYTES: "bytes",
            DOUBLE: "double",
            ENUM: "enum",
            FALSE: "false",
            FIXED32: "fixed32",
            FIXED64: "fixed64",
            FLOAT: "float",
            IMPORT: "import",
            INT32: "int32",
            INT64: "int64",
            MAP: "map",
            MESSAGE: "message",
            ONEOF: "oneof",
            OPTION: "option",
            PACKAGE: "package",
            PROTO3_DOUBLE: "\"proto3\"",
            PROTO3_SINGLE: "'proto3'",
            PUBLIC: "public",
            REPEATED: "repeated",
            REQUIRED: "required",
            RESERVED: "reserved",
            RETURNS: "returns",
            RPC: "rpc",
            SERVICE: "service",
            SFIXED32: "sfixed32",
            SFIXED64: "sfixed64",
            SINT32: "sint32",
            SINT64: "sint64",
            STREAM: "stream",
            STRING: "string",
            SYNTAX: "syntax",
            TO: "to",
            true: "true",
            UINT32: "uint32",
            UINT64: "uint64",
            WEAK: "weak",
            Identifier: "(" + this.fragLetter + "(" + this.fragLetter + "|" + this.fragDecimalDigit + ")*)",
            IntegerLiteral: "(" + this.fragDecimalLiteral + ")|(" + this.fragOctalLiteral + ")|(" + this.fragHexLiteral + ")",
            FloatLiteral: "((" + this.fragDecimals + "\\.(" + this.fragDecimals + ")?" + this.fragExponent + "?|" + this.fragDecimals + this.fragExponent + "|\\." + this.fragDecimals + "?)|inf|nan)",
            StringLiteral: "(('" + this.fragCharValue + "*')|(\"" + this.fragCharValue + "*\"))",
            Quote: "('|\")",
            LPAREN: "\\(",
            RPAREN: "\\)",
            LBRACE: "\\{",
            RBRACE: "\\}",
            LBRACK: "\\[",
            RBRACK: "\\]",
            LCHEVR: "<",
            RCHEVR: ">",
            SEMI: ";",
            COMMA: ",",
            DOT: "\\.",
            MINUS: "-",
            PLUS: "\\+",
            ASSIGN: "=",
            wHITESPACE: "\\s+",
            cOMMENT: "\\/\\*.*?\\*\\/",
            lINECOMMENT: "\\/\\/[^\\r\\n]"
        };
    }
    LexerService.prototype.reset = function () {
    };
    LexerService.prototype.initialize = function (src, tokenAutoFix) {
        this.tokenAutoFix = tokenAutoFix;
        this.src = src;
        this.initialSrc = src;
        this.tokens = [];
    };
    LexerService.prototype.getTokens = function () {
        do {
            var token = this.getNextToken();
            this.filterToken(token);
        } while (token.name != "EOF");
        //this.tokens.pop();
        var result = [];
        result.push(this.tokens);
        if (this.src === "") {
            result.push("success");
        }
        else {
            result.push("failure");
            result.push(this.src);
            var errorLine = 0;
            var errorIndex = 0;
            var initialLines = this.initialSrc.split("\n");
            var remainingLines = this.src.split("\n");
            initialLines.forEach(function (line, number) {
                if (line.indexOf(remainingLines[0]) != -1) {
                    errorLine = number + 1;
                    errorIndex = line.indexOf(remainingLines[0]) + 1;
                    return;
                }
            });
            result.push(errorLine);
            result.push(errorIndex);
        }
        return result;
    };
    LexerService.prototype.filterToken = function (token) {
        if (!(token.name[0] === token.name[0].toLowerCase() &&
            token.name[token.name.length - 1] === token.name[token.name.length - 1].toUpperCase())) {
            this.tokens.push(token);
        }
    };
    LexerService.prototype.getNextToken = function () {
        var longest = 0;
        var name = "";
        var value = "";
        for (var i in this.lexerGrammar) {
            var regex = new RegExp("^" + this.lexerGrammar[i]);
            var result = this.src.match(regex);
            if (result) {
                if (result[0].length > longest) {
                    longest = result[0].length;
                    name = i;
                    value = result[0];
                }
            }
        }
        var next = new token_1.Token("", "");
        if (longest > 0) {
            next.name = name;
            if (name === name.toUpperCase()) {
                next.value = "";
            }
            else {
                next.value = value;
            }
            this.src = this.src.replace(value, "");
            return next;
        }
        else {
            if (this.tokenAutoFix && this.src.length > 0) {
                this.src = this.src.replace(this.src[0], "");
                next.name = "placebO";
                return next;
            }
            else {
                next.name = "EOF";
                return next;
            }
        }
    };
    return LexerService;
}());
exports.LexerService = LexerService;
