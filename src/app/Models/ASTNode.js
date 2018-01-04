"use strict";
var ASTNode = (function () {
    function ASTNode(ruleName, tokenName) {
        this.children = [];
        this.rule = "";
        this.token = "";
        this.tree = "";
        this.value = "moin";
        this.rule = ruleName;
        this.token = tokenName;
    }
    ASTNode.prototype.addChild = function (node) {
        this.children.push(node);
    };
    ASTNode.prototype.draw = function () {
        this.tree = this.getType();
        for (var child in this.children) {
            this.drawLevel(this.children[child], 1);
        }
        return this.tree;
    };
    ASTNode.prototype.drawLevel = function (node, level) {
        this.tree += "\n|";
        for (var i = 0; i < level; i++) {
            this.tree += "__";
        }
        this.tree += node.getType();
        for (var child in node.children) {
            this.drawLevel(node.children[child], level + 1);
        }
    };
    ASTNode.prototype.getType = function () {
        if (this.rule != "") {
            return "Rule: " + this.rule;
        }
        else {
            if (this.value != "") {
                return "Token: " + this.token + " - Value: " + this.value;
            }
            else {
                return "Token: " + this.token;
            }
        }
    };
    return ASTNode;
}());
exports.ASTNode = ASTNode;
