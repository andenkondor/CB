import { componentFactoryName } from "@angular/compiler";
import { ASTNode } from "./ASTNode";

export class ScopeNode {
  constructor() {
  }
  name = "";
  children: ScopeNode[] = [];
  parent: ScopeNode;
  nameNodes: ASTNode[] = [];
  typeNodes: ASTNode[] = [];
  tree = "";



  //Neues Kind hinzufügen
  addChild(node: ScopeNode) {
    this.children.push(node);
  }
  //Elternknoten hinzufügen
  addParent(node: ScopeNode) {
    this.parent = node;
  }

  //Tree von aktuellem Knoten als String-Repräsentation ausgeben
  draw() {

    this.tree = this.name;
    for (var child in this.children) {
      this.drawLevel(this.children[child], 1);
    }

    return this.tree;
  }

  //Gibt rekursiv für jede Ebene des Baums die String-Repräsentation aus
  drawLevel(node: ScopeNode, level) {
    this.tree += "\n|"
    for (var i = 0; i < level; i++) {
      this.tree += "__";
    }
    this.tree += node.name;
    for (var child in node.children) {
      this.drawLevel(node.children[child], level + 1);
    }
  }

  //Knoten und jegliche Kind-Knoten in Liste ausgeben
  treeAsList(node: ScopeNode) {
    var treeList = [];
    treeList.push(node);
    for (var child in node.children) {
      treeList = treeList.concat(this.treeAsList(node.children[child]));
    }
    return treeList;

  }











}