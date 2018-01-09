import { componentFactoryName } from "@angular/compiler";
import { ASTNode } from "./ASTNode";

export class ScopeNode {
  constructor() {
   }
  name = "";
  children:ScopeNode[] = [];
  parent:ScopeNode;
  nodes:ASTNode[] = [];
  tree = "";




  addChild(node: ScopeNode) {
    this.children.push(node);
  }

  addParent(node: ScopeNode){
      this.parent = node;
  }


  draw() {
    
    this.tree = this.name;
    for (var child in this.children) {
      this.drawLevel(this.children[child], 1);
    }

    return this.tree;
  }

  drawLevel(node:ScopeNode, level) {
    this.tree += "\n|"
    for (var i = 0; i < level; i++) {
      this.tree += "__";
    }
    this.tree += node.name;
    for (var child in node.children) {
      this.drawLevel(node.children[child], level+1);
      
    }


  }


  


  

 

  

}