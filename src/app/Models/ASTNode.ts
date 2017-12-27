export class ASTNode {
  constructor(ruleName, tokenName) {
    this.rule = ruleName;
    this.token = tokenName;
   }
  children:ASTNode[] = [];
  rule = "";
  token = "";
  tree = "";




  addChild(node: ASTNode) {
    this.children.push(node);
  }


  draw() {
    
    this.tree = this.getType();
    for (var child in this.children) {
      this.drawLevel(this.children[child], 1);
    }

    return this.tree;
  }

  drawLevel(node:ASTNode, level) {
    this.tree += "\n|"
    for (var i = 0; i < level; i++) {
      this.tree += "__";
    }
    this.tree += node.getType();
    for (var child in node.children) {
      this.drawLevel(node.children[child], level+1);
      
    }


  }


  getType() {
    if (this.rule != "") {
      return "Rule: " + this.rule;
    } else {
      return "Token: " + this.token;
    }
  }

}