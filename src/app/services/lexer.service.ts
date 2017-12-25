import { Token } from '../models/token';

export class LexerService {


    src: string = "";
    initialSrc: string = "";
    tokens = [];
    tokenAutoFix;

    fragLetter: string = "[A-Za-z_]";
    fragDecimalDigit: string = "[0-9]";
    fragOctalDigit: string = "[0-7]";
    fragHexDigit: string = "[0-9A-Fa-f]";
    fragDecimalLiteral: string = "[1-9]" + this.fragDecimalDigit + "*";
    fragOctalLiteral: string = "0" + this.fragOctalDigit + "*";
    fragHexLiteral: string = "0(x|X)" + this.fragHexDigit + "*";
    fragDecimals: string = this.fragDecimalDigit + "+";
    fragExponent: string = "(e|E)(\\+|-)?" + this.fragDecimals;
    fragHexEscape = "\\\\(x|X)" + this.fragHexDigit + "{2}"
    fragOctalEscape = "\\\\" + this.fragOctalDigit + "{3}";
    fragCharEscape = "\\\\[abfnrtv\\'\"]";
    fragCharValue = this.fragHexEscape + "|" + this.fragOctalEscape + "|" + this.fragCharEscape + "|[^\0\n\\\\]";



    lexerGrammar = {
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

        Identifier: this.fragLetter + "(" + this.fragLetter + "|" + this.fragDecimalDigit + ")*",
        IntegerLiteral: "(" + this.fragDecimalLiteral + ")|(" + this.fragOctalLiteral + ")|(" + this.fragHexLiteral + ")",
        FloatLiteral: "(" + this.fragDecimals + "\\.(" + this.fragDecimals + ")?" + this.fragExponent + "?|" + this.fragDecimals + this.fragExponent + "|\\." + this.fragDecimals + "?)|inf|nan",
        StringLiteral: "'" + this.fragCharValue + "*'|\"" + this.fragCharValue + "*\"",
        Quote: "'|\"",

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
    }


    constructor() {
    }

    reset(){

    }
    initialize(src,tokenAutoFix) {
        this.tokenAutoFix = tokenAutoFix;        
        this.src = src;
        this.initialSrc = src;
        this.tokens = [];
    }

    getTokens() {
        do {
            var token = this.getNextToken()
            this.filterToken(token);
        } while (token.name != "EOF");
        this.tokens.pop();

        var result = [];
        result.push(this.tokens);

        if (this.src === "") {
            result.push("success");
        } else {
            result.push("failure");
            result.push(this.src);
            var errorLine = 0;
            var errorIndex = 0;
            var initialLines = this.initialSrc.split("\n");
            var remainingLines = this.src.split("\n");
            initialLines.forEach(function(line,number){
                if(line.indexOf(remainingLines[0]) != -1){
                    errorLine = number+1;
                    errorIndex = line.indexOf(remainingLines[0])+1;
                    return;
                }
            })
            result.push(errorLine);
            result.push(errorIndex);
        }

        return result;
    }

    filterToken(token) {
        if (!(token.name[0] === token.name[0].toLowerCase() &&
            token.name[token.name.length - 1] === token.name[token.name.length - 1].toUpperCase())) {
            this.tokens.push(token);
        }
    }
    getNextToken() {

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
        var next = new Token("", "");
        if (longest > 0) {
            next.name = name;
            if (name === name.toUpperCase()) {
                next.value = "";
            } else {
                next.value = value;
            }
            this.src = this.src.replace(value, "");
            return next;
        } else {
            if (this.tokenAutoFix && this.src.length > 0) {
                this.src = this.src.replace(this.src[0], "");
                next.name = "placebO";
                return next;
            } else {
                next.name = "EOF";
                return next;
            }
        }
    }


}