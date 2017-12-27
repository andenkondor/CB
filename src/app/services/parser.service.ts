import { Token } from '../models/token';
import { ASTNode } from '../models/ASTNode';

export class ParserService {

    tokens = [];
    ringbuffer = [];
    position = 0;
    lookahead;

    initialize(tokens, lookahead) {
        this.tokens = tokens;
        this.lookahead = lookahead;

        if (this.tokens.length < 1) {
            throw { name: "NoTokensError", message: "No Tokens for Parsing supplied" };
        }
        for (var i = 0; i < this.lookahead; i++) {
            if (this.tokensLeft()) {
                this.ringbuffer.push(this.tokens[0]);
                this.tokens.shift();
            }
        }

        this.lookahead = this.ringbuffer.length;
    }

    consume() {
        if (this.tokensLeft()) {
            this.ringbuffer[this.position] = this.tokens[0];
            this.tokens.shift();
            this.position = (this.position + 1) % this.lookahead;
        } else {
            if (this.ringbuffer.length >= 1) {
                if (this.position == this.lookahead - 1) {
                    this.position = 0
                    this.ringbuffer.splice(this.lookahead-1, 1);
                } else {
                    this.ringbuffer.splice(this.position, 1);
                }
                this.lookahead--;
            } else if (this.ringbuffer.length == 0) {
                throw { name: "NoTokensLeftError", message: "No more Tokens to consume" };

            }
        }
    }

    getLookaheadToken(lookahead) {
        if (this.lookaheadLeft()) {
            return this.ringbuffer[(this.position + lookahead - 1) % this.lookahead];
        } else {
            throw { name: "NoTokensLeftError", message: "No more Tokens to read" };
        }

    }

    match(tokenName, node:ASTNode) {
        if (this.getLookaheadToken(1).name === tokenName) {
    
            var tokenNode:ASTNode = new ASTNode("",tokenName);
            node.addChild(tokenNode);
            this.consume();
        } else {
            throw { name: "NoTokenMatchError", message: "Cannot assign Token "+this.getLookaheadToken(1).name };

        }
    }

    lookaheadLeft() {
        return (this.ringbuffer.length > 0);
    }

    tokensLeft() {
        return (this.tokens.length > 0);
    }

    parsing() {
        var result = [];
        var startNode:ASTNode = new ASTNode("start","");
        try {
            this.protoStart(startNode);
            result.push(startNode);
            result.push("success");
        } catch (e) {
            console.log(e.name + ": " + e.message);
            if (e.name === "NoTokenMatchError") {
                result[1] = "failure";
            } else if (e.name === "NoTokensLeftError") {
                result[1] = "failure";
            } else if (e.name === "NoTokensError") {
                result[1] = "failure";
            } else {
                throw e;
            }
        }
        return result;
    }








    protoStart(node:ASTNode) {
        this.syntax(node);
        this.match("EOF", node);
    }

    syntax(node:ASTNode) {
        var syntaxNode:ASTNode = new ASTNode("syntax", "");

        this.match("SYNTAX", syntaxNode);
        this.match("ASSIGN", syntaxNode);

        var nextToken = this.getLookaheadToken(1);

        switch (nextToken.name) {
            case "PROTO3_SINGLE":
                this.match("PROTO3_SINGLE", syntaxNode);
                break;
            case "PROTO3_DOUBLE":
                this.match("PROTO3_DOUBLE", syntaxNode);
                break;
            default:
                throw { name: "NoTokenMatchError", message: "Token does not match input" };
        }

        this.match("SEMI", syntaxNode);
        node.addChild(syntaxNode);
    }










}