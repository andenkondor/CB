import { Token } from '../models/token';

export class LexerService {


    src: string = "";

    fragLetter: string = "[A-Za-z_]";
    fragDecimalDigit: string = "[0-9]";
    fragOctalDigit: string = "[0-7]";
    fragHexDigit: string = "[0-9A-Fa-f]";
    fragDecimalLiteral: string = "[1-9]" + this.fragDecimalDigit + "*";
    fragOctalLiteral: string = "0" + this.fragOctalDigit + "*";
    fragHexLiteral: string = "0(x|X)" + this.fragHexDigit + "*";
    fragDecimals: string = this.fragDecimalDigit + "+";
    fragExponent: string = "(e|E)(\\+|-)?" + this.fragDecimals;
    fragHexEscape = "\\(x|X)" + this.fragHexDigit + this.fragHexDigit;
    fragOctalEscape = "\\" + this.fragOctalDigit + this.fragOctalDigit + this.fragOctalDigit;
    fragCharEscape = "\\[abfnrtv\\'\"]";
    fragCharValue = this.fragHexEscape + "|" + this.fragOctalEscape + "|" + this.fragCharEscape + "|[^\0\n\\]";



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
        IntegerLiteral: this.fragDecimalLiteral + "|" + this.fragOctalLiteral + "|" + this.fragHexLiteral,
        FloatLiteral: "(" + this.fragDecimals + "\\." + this.fragDecimals + "?" + this.fragExponent + "?|" + this.fragDecimals + this.fragExponent + "|\\." + this.fragDecimals + "?)|inf|nan",
        StringLiteral: "'" + this.fragCharValue + "*'|\"" + this.fragCharValue + "*\"",
        Quote: "'|\"",

        LPAREN: "(",
        RPAREN: ")",
        LBRACE: "{",
        RBRACE: "}",
        LBRACK: "[",
        RBRACK: "]",
        LCHEVR: "<",
        RCHEVR: ">",
        SEMI: ",",
        COMMA: ",",
        DOT: ".",
        MINUS: "-",
        PLUS: "+",
        ASSIGN: "=",
        WHITESPACE: "\s+",
        COMMENT: "\/\*.*?\*\/",
        LINECOMMENT: "\/\/[^\r\n]"
    }


    constructor() {
    } 

    initialize(src){
        this.src = src;
    }

    getTokens(){
        var tokens:Token[];
        do{
            var token = this.getNextToken()
            tokens.push(token);
        }while(token != null);
        return tokens;
    }
    getNextToken() {

        var longest = 0;
        var name = "";
        var value = "";
        for (var i in this.lexerGrammar) {
            var result = "/^" + this.src.match(this.lexerGrammar[i])
            if (result[0] != "") {
                if (result[0].length > longest) {
                    longest = result[0].length;
                    name = result[0];
                    value = result[0];
                }
            }
        }
        if (longest > 0) {
            var next: Token;
            next.name = name;
            if (name === name.toUpperCase()) {
                next.value = result[0];
            } else {
                next.value = "";
            }
            this.src.replace(value, "");
        } else {
            return null;
        }
    }


}