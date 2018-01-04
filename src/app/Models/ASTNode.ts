import { componentFactoryName } from "@angular/compiler";

export class ASTNode {
  constructor(ruleName, tokenName) {
    this.rule = ruleName;
    this.token = tokenName;
   }
  children:ASTNode[] = [];
  rule = "";
  token = "";
  tree = "";
  value = "moin";




  addChild(node: ASTNode) {
    this.children.push(node);
  }


  draw() {
    
    this.tree = this.getType();
    for (var child in this.children) {
      this.drawLevel(this.children[child], 1);
      console.log("1");
    }

    return this.tree;
  }

  drawLevel(node:ASTNode, level) {
    this.tree += "\n|"
    for (var i = 0; i < level; i++) {
      console.log("2");
      this.tree += "__";
    }
    this.tree += node.getType();
    for (var child in node.children) {
      console.log("3");
      this.drawLevel(node.children[child], level+1);
      
    }


  }


  getType() {
    if (this.rule != "") {
      return "Rule: " + this.rule;
    } else {
      if(this.value != ""){
        return "Token: " + this.token+" - Value: "+this.value;
      }else{
        return "Token: " + this.token;
      }
      
    }
  }

  copy(){

    var copyNode:ASTNode = new ASTNode("","");

    this.copyProperties(copyNode,this);
    for (var child in this.children) {
      console.log("4");
      var copyChild:ASTNode = new ASTNode("","");
      this.copyRec(copyChild,copyNode,this.children[child]);

    }

    return copyNode;
  }

    copyRec(copyNode: ASTNode, copyParent: ASTNode, originNode:ASTNode){
      this.copyProperties(copyNode,originNode);
      copyParent.addChild(copyNode);

      for (var child in originNode.children) {
        console.log("5");
        
        var copyChild:ASTNode = new ASTNode("","");
        this.copyRec(copyChild,copyNode,originNode.children[child]);
      }



  }

  copyProperties(copyNode:ASTNode, originNode:ASTNode){
    copyNode.rule = originNode.rule;
    copyNode.token = originNode.token;
    copyNode.tree = originNode.tree;
    copyNode.value = originNode.value;
  }

}