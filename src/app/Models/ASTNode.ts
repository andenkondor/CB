import { componentFactoryName } from "@angular/compiler";

export class ASTNode {
  constructor(ruleName, tokenName) {
    this.rule = ruleName;
    this.token = tokenName;
  }
  children: ASTNode[] = [];
  rule = "";
  token = "";
  tree = "";
  value = "";
  line;
  index;
  counter = 1;


  //Neues Kind hinzufügen
  addChild(node: ASTNode) {
    this.children.push(node);
  }


  //Tree von aktuellem Knoten als String-Repräsentation ausgeben
  draw() {
    this.tree = this.getType();
    for (var child in this.children) {
      this.drawLevel(this.children[child], 1);
    }

    return this.tree;
  }

  //Gibt rekursiv für jede Ebene des Baums die String-Repräsentation aus
  drawLevel(node: ASTNode, level) {
    this.tree += "\n|"
    for (var i = 0; i < level; i++) {
      this.tree += "__";
    }
    this.tree += node.getType();
    for (var child in node.children) {
      this.drawLevel(node.children[child], level + 1);

    }


  }

  //toString-Methode eines Knoten
  getType() {
    if (this.rule != "") {
      return "Rule: " + this.rule;
    } else {
      if (this.value != "") {
        return "Token: " + this.token + " - Value: " + this.value;
      } else {
        return "Token: " + this.token;
      }

    }
  }

  //toString-Methode mit NewLine zwischen Token und Value
  getTypeNewline() {
    if (this.rule != "") {
      return "Rule: " + this.rule;
    } else {
      if (this.value != "") {
        return "Token: " + this.token + " - \nValue: " + this.value;
      } else {
        return "Token: " + this.token;
      }

    }
  }


  //Deep-Copy eines Knoten und allen seinen Kindern
  copy() {

    var copyNode: ASTNode = new ASTNode("", "");

    this.copyProperties(copyNode, this);
    for (var child in this.children) {
      var copyChild: ASTNode = new ASTNode("", "");
      this.copyRec(copyChild, copyNode, this.children[child]);

    }

    return copyNode;
  }

  //Rekursive Hilfsfunktion zum Kopieren
  copyRec(copyNode: ASTNode, copyParent: ASTNode, originNode: ASTNode) {
    this.copyProperties(copyNode, originNode);
    copyParent.addChild(copyNode);

    for (var child in originNode.children) {

      var copyChild: ASTNode = new ASTNode("", "");
      this.copyRec(copyChild, copyNode, originNode.children[child]);
    }



  }

  //Kopieren eines einzelnen Knoten
  copyProperties(copyNode: ASTNode, originNode: ASTNode) {
    copyNode.rule = originNode.rule;
    copyNode.token = originNode.token;
    copyNode.tree = originNode.tree;
    copyNode.value = originNode.value;
    copyNode.index = originNode.index;
    copyNode.line = originNode.line;
  }

  //Knoten und jegliche Kind-Knoten in Liste ausgeben
  treeAsList(node: ASTNode) {
    var treeList = [];
    treeList.push(node);
    for (var child in node.children) {
      treeList = treeList.concat(this.treeAsList(node.children[child]));
    }
    return treeList;

  }

  //Grafische Darstellung eines Baums mithilfe von vis.js
  getGraphic(nodes, edges) {

    var id = this.counter;
    nodes.push({ shape: "circle", color: "red", id: id, label: this.getTypeNewline() });
    this.counter++;
    for (var i in this.children) {
      this.getGraphicRec(this.children[i], nodes, edges, id);
    }

    var result = [];
    result.push(nodes);
    result.push(edges);

    return result;

  }
  //Rekursive Hilfsfunktion zur graphischen Ausgabe eines Baums mit vis.js
  getGraphicRec(child, nodes, edges, index) {
    var id = this.counter;
    nodes.push({ id: id, label: child.getTypeNewline() });
    this.counter++;
    edges.push({ from: index, to: id });

    if (!child.children || child.children.length == 0) {
      return;
    } else {
      for (var i in child.children) {
        this.getGraphicRec(child.children[i], nodes, edges, id);
      }
    }

  }



}