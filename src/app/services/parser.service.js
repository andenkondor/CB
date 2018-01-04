"use strict";
var ASTNode_1 = require('../models/ASTNode');
var ParserService = (function () {
    function ParserService() {
        this.tokens = [];
        this.ringbuffer = [];
        this.position = 0;
    }
    ParserService.prototype.initialize = function (tokens, lookahead) {
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
    };
    ParserService.prototype.consume = function () {
        if (this.tokensLeft()) {
            this.ringbuffer[this.position] = this.tokens[0];
            this.tokens.shift();
            this.position = (this.position + 1) % this.lookahead;
        }
        else {
            if (this.ringbuffer.length >= 1) {
                if (this.position == this.lookahead - 1) {
                    this.position = 0;
                    this.ringbuffer.splice(this.lookahead - 1, 1);
                }
                else {
                    this.ringbuffer.splice(this.position, 1);
                }
                this.lookahead--;
            }
            else if (this.ringbuffer.length == 0) {
                throw { name: "NoTokensLeftError", message: "No more Tokens to consume" };
            }
        }
    };
    ParserService.prototype.getLookaheadToken = function (lookahead) {
        if (this.lookaheadLeft()) {
            return this.ringbuffer[(this.position + lookahead - 1) % this.lookahead];
        }
        else {
            throw { name: "NoTokensLeftError", message: "No more Tokens to read" };
        }
    };
    ParserService.prototype.match = function (tokenName, node) {
        console.log("hab ich " + this.getLookaheadToken(1).name + ". muss ich: " + tokenName);
        if (this.getLookaheadToken(1).name === tokenName) {
            var tokenNode = new ASTNode_1.ASTNode("", tokenName);
            tokenNode.value = this.getLookaheadToken(1).value;
            console.log(tokenNode.value);
            node.addChild(tokenNode);
            this.consume();
        }
        else {
            throw { name: "NoTokenMatchError", message: "Token found " + this.getLookaheadToken(1).name + ". Token needed: " + tokenName };
        }
    };
    ParserService.prototype.lookaheadLeft = function () {
        return (this.ringbuffer.length > 0);
    };
    ParserService.prototype.tokensLeft = function () {
        return (this.tokens.length > 0);
    };
    ParserService.prototype.parsing = function () {
        var result = [];
        var startNode = new ASTNode_1.ASTNode("start", "");
        try {
            this.protoStart(startNode);
            result.push(startNode);
            result.push("success");
        }
        catch (e) {
            console.log(e.name + ": " + e.message);
            if (e.name === "NoTokenMatchError") {
                result[1] = "failure";
            }
            else if (e.name === "NoTokensLeftError") {
                result[1] = "failure";
            }
            else if (e.name === "NoTokensError") {
                result[1] = "failure";
            }
            else {
                throw e;
            }
        }
        return result;
    };
    ParserService.prototype.protoStart = function (node) {
        this.syntax(node);
        if (this.spec_import()) {
            this.import(node);
        }
        else if (this.spec_package()) {
            this.package(node);
        }
        else if (this.spec_option()) {
            this.option(node);
        }
        else if (this.spec_toplevel()) {
            this.toplevel(node);
        }
        else {
            this.empty(node);
        }
        this.match("EOF", node);
    };
    ParserService.prototype.syntax = function (node) {
        var syntaxNode = new ASTNode_1.ASTNode("syntax", "");
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
    };
    ParserService.prototype.spec_import = function () {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            this.import();
        }
        catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            }
            else {
                throw e;
            }
        }
        finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            return success;
        }
    };
    ParserService.prototype.spec_package = function () {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            this.package();
        }
        catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            }
            else {
                throw e;
            }
        }
        finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            return success;
        }
    };
    ParserService.prototype.spec_option = function () {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            this.option();
        }
        catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            }
            else {
                throw e;
            }
        }
        finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            return success;
        }
    };
    ParserService.prototype.spec_toplevel = function () {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            this.toplevel();
        }
        catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            }
            else {
                throw e;
            }
        }
        finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            return success;
        }
    };
    ParserService.prototype.import = function (node) {
        if (node === void 0) { node = null; }
        var importNode = new ASTNode_1.ASTNode("import", "");
        this.match("IMPORT", importNode);
        var nextToken = this.getLookaheadToken(1);
        switch (nextToken.name) {
            case "WEAK":
                this.match("WEAK", importNode);
                break;
            case "PUBLIC":
                this.match("PUBLIC", importNode);
                break;
            default:
        }
        this.match("StringLiteral", importNode);
        this.match("SEMI", importNode);
        if (node) {
            node.addChild(importNode);
        }
    };
    ParserService.prototype.package = function (node) {
        if (node === void 0) { node = null; }
        var packageNode = new ASTNode_1.ASTNode("package", "");
        this.match("PACKAGE", packageNode);
        this.fullIdentifier(packageNode);
        this.match("SEMI", packageNode);
        if (node) {
            node.addChild(packageNode);
        }
    };
    ParserService.prototype.option = function (node) {
        if (node === void 0) { node = null; }
        var optionNode = new ASTNode_1.ASTNode("option", "");
        this.match("OPTION", optionNode);
        if (node) {
            node.addChild(optionNode);
        }
    };
    ParserService.prototype.toplevel = function (node) {
        if (node === void 0) { node = null; }
        var toplevelNode = new ASTNode_1.ASTNode("toplevel", "");
        this.match("true", toplevelNode);
        if (node) {
            node.addChild(toplevelNode);
        }
    };
    ParserService.prototype.empty = function (node) {
        if (node === void 0) { node = null; }
        var emptyNode = new ASTNode_1.ASTNode("empty", "");
        this.match("SEMI", emptyNode);
        if (node) {
            node.addChild(emptyNode);
        }
    };
    ParserService.prototype.fullIdentifier = function (node) {
        var fullIdentNode = new ASTNode_1.ASTNode("fullIdent", "");
        this.match("Identifier", fullIdentNode);
        try {
            while (true) {
                this.match("DOT", fullIdentNode);
                this.match("Identifier", fullIdentNode);
            }
        }
        catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;
            }
        }
        finally {
            node.addChild(fullIdentNode);
        }
    };
    return ParserService;
}());
exports.ParserService = ParserService;
