import { Token } from '../models/token';
import { ASTNode } from "../models/ASTNode";
import { ScopeNode } from "../models/ScopeNode";

export class SemanticAnalyzerService {

    tree: ASTNode;
    errors = [];

    initialize(tree) {
        this.tree = tree;
        this.errors = [];

    }



    analyze() {
        this.errors = this.errors.concat(this.messageUniqueTagsAnalyzation());
        this.errors = this.errors.concat(this.messageTagValueAnalyzation());
        this.errors = this.errors.concat(this.enumStartswithZero());
        this.errors = this.errors.concat(this.scopeDoubleIdentifiers(true, null));
        this.errors = this.errors.concat(this.doubleEnumTagAnalyzation());
        




        if (this.errors.length > 0) {
            this.errors.unshift("failure");
        } else {
            this.errors.unshift("success");
        }

        return this.errors;

    }
    //Sucht nach doppelten Identifiern innerhalb eines Scopes
    scopeDoubleIdentifiers(init, scope: ScopeNode) {
        if (init) {
            scope = new ScopeNode();
            scope.name = "start";
            scope = this.getScope(this.tree, scope);
        }
        var errormessages = [];
        var identifiers = [];
        for (var token in scope.nodes) {
            if (scope.nodes[token].token === "Identifier") {
                identifiers.push(scope.nodes[token]);
            }
        }

        if (identifiers.length > 1) {
            identifiers = this.check_duplicateTokens(identifiers);

            for (var i = 0; i < identifiers.length; i++) {
                errormessages.push("Duplicate identifier '" +
                    identifiers[i].value + "' in lines " + identifiers[i].line + " and " + identifiers[i + 1].line);
                i++;
            }
        }



        for (var child in scope.children) {
            errormessages = errormessages.concat(this.scopeDoubleIdentifiers(false, scope.children[child]));
        }



        return errormessages;


    }


    getScope(tree: ASTNode, scopes: ScopeNode) {

        for (var child in tree.children) {
            if (tree.children[child].rule === "enumName" ||
                tree.children[child].rule === "messageName" ||
                tree.children[child].rule === "fieldName") {
                    scopes.nodes.push(tree.children[child].children[0]);
            } else if (tree.children[child].rule === "messageBody") {
                var newScope: ScopeNode = new ScopeNode();
                newScope.addParent(scopes);
                scopes.addChild(newScope);
                newScope.name = "messageScope";
                this.getScope(tree.children[child], newScope);
            } else if (tree.children[child].rule === "enumBody") {
                var newScope: ScopeNode = new ScopeNode();
                newScope.addParent(scopes);
                scopes.addChild(newScope);
                newScope.name = "enumScope";
                this.getScope(tree.children[child], newScope);
            } else if (tree.children[child].rule != "") {
                this.getScope(tree.children[child], scopes);
            }
        }

        return scopes;

    }

    //Prüft, ob alle Enums mit dem Tag 0 starten
    enumStartswithZero() {

        var allNodes = [];
        allNodes = this.tree.treeAsList(this.tree);
        var enumNodes = [];
        var bodyNodes = [];
        var errorMessages = [];

        for (var node in allNodes) {
            //Alle existierenden Nodes
            if (allNodes[node].rule === "enumDefinition") {
                //Alle Node, die enumDefinition sind
                enumNodes.push(allNodes[node]);
            }
        }

        for (var node in enumNodes) {
            //Alle Nodes, die enumDefinition sind
            for (var childNode in enumNodes[node].children) {
                //Alle direkten Kinder der enumDefinitions
                if (enumNodes[node].children[childNode].rule === "enumBody") {

                    //Alle direkten Kinder der enums, die Body sind
                    bodyNodes.push(enumNodes[node].children[childNode]);
                }
            }
        }

        for (var idx in bodyNodes) {
            //Für alle gespeicherten enumBodies
            for (var child in bodyNodes[idx].children) {
                if (bodyNodes[idx].children[child].rule === "enumField") {
                    if (bodyNodes[idx].children[child].children[2].token === "IntegerLiteral") {
                        if (bodyNodes[idx].children[child].children[2].value != 0) {
                            errorMessages.push("First Field Tag '" + bodyNodes[idx].children[child].children[2].value + "' in Enum in line " +
                                bodyNodes[idx].children[child].children[2].line + " and at index " + bodyNodes[idx].children[child].children[2].index +
                                " does not equal zero.");

                        }
                    } else if (bodyNodes[idx].children[child].children[3].token === "IntegerLiteral") {
                        if (bodyNodes[idx].children[child].children[3].value != 0) {
                            errorMessages.push("First Field Tag '" + bodyNodes[idx].children[child].children[2].value + "' in Enum in line " +
                                bodyNodes[idx].children[child].children[3].line + " and at index " + bodyNodes[idx].children[child].children[3].index +
                                " does not equal zero.");

                        }

                    }
                    break;
                }
            }

        }

        return errorMessages;

    }

    //Prüft, ob alle Enum-Tags einzigartig
    doubleEnumTagAnalyzation(){

        var allNodes = [];
        allNodes = this.tree.treeAsList(this.tree);
        var enumNodes = [];
        var tagNodes = [];
        var duplicateTags = [];
        var errorMessages = [];


        for (var node in allNodes) {
            //Alle existierenden Nodes
            if (allNodes[node].rule === "enumBody") {
                //Alle Nodes, die enumBody sind
                enumNodes.push(allNodes[node]);
                tagNodes.push([]);
            }
        }

        for (var node in enumNodes) {
            //Alle Nodes, die enumBody sind
            for (var childNode in enumNodes[node].children) {
                //Alle direkten Kinder der enumBodies
                if (enumNodes[node].children[childNode].rule === "enumField") {
                    //Alle direkten Kinder der enumBodies, die Field sind
                    tagNodes[node].push(enumNodes[node].children[childNode]);
                }
            }
        }

        for (var body in tagNodes) {
            //Für alle gespeicherten enumBodies
            var tagNumbers = [];
            for (var fieldNode in tagNodes[body]) {
                //Pro enumBody alle enumFields            
                for (var names in tagNodes[body][fieldNode].children) {
                    //Pro FieldNumber alle Kinder
                    if (tagNodes[body][fieldNode].children[names].rule === "enumFieldTag") {
                        //Falls ein FieldNode Kind eine FieldNumber ist
                        tagNumbers.push(tagNodes[body][fieldNode].children[names].children[0]);
                    }
                }

            }
            if (tagNumbers.length > 1) {
                duplicateTags = duplicateTags.concat(this.check_duplicateTokens(tagNumbers));
            }

        }
        for (var i = 0; i < duplicateTags.length; i++) {
            errorMessages.push("Duplicate enum tag '" +
            duplicateTags[i].value + "' in lines " + duplicateTags[i].line + " and " + duplicateTags[i + 1].line);
            i++;
        }

        return errorMessages;

    }
    
    
    
    //Prüft, ob alle Message-Tags validen Wert besitzen
    messageTagValueAnalyzation() {

        var allNodes = [];
        allNodes = this.tree.treeAsList(this.tree);
        var messageNodes = [];
        var fieldNodes = [];
        var errorMessages = [];


        for (var node in allNodes) {
            //Alle existierenden Nodes
            if (allNodes[node].rule === "messageBody") {
                //Alle Node, die messageBody sind
                messageNodes.push(allNodes[node]);
                fieldNodes.push([]);
            }
        }

        for (var node in messageNodes) {
            //Alle Nodes, die MessageBody sind
            for (var childNode in messageNodes[node].children) {
                //Alle direkten Kinder der MessageBodies
                if (messageNodes[node].children[childNode].rule === "field") {
                    //Alle direkten Kinder der MessageBodies, die Field sind
                    fieldNodes[node].push(messageNodes[node].children[childNode]);
                }
            }
        }

        for (var message in fieldNodes) {
            //Für alle gespeicherten MessageBodies
            for (var fieldNode in fieldNodes[message]) {
                //Pro MessageBody alle FieldNodes            
                for (var names in fieldNodes[message][fieldNode].children) {
                    //Pro FieldNode alle Kinder
                    if (fieldNodes[message][fieldNode].children[names].rule === "fieldNumber") {
                        var tagToken = fieldNodes[message][fieldNode].children[names].children[0];
                        if (tagToken.value < 1 || tagToken.value > 536870911) {
                            errorMessages.push("Message Field Tag '" + tagToken.value + "' in line " + tagToken.line + " and at index " + tagToken.index + " is out of range (1-536870911).");
                        } else if (tagToken.value >= 19000 || tagToken.value > 19999) {
                            errorMessages.push("Message Field Tag '" + tagToken.value + "' in line " + tagToken.line + " and at index " + tagToken.index + " is in reserved range (19000-19999).");
                        }
                    }
                }

            }

        }

        return errorMessages;
    }




    //Prüft, ob alle Message-Tags einzigartig
    messageUniqueTagsAnalyzation() {

        var allNodes = [];
        allNodes = this.tree.treeAsList(this.tree);
        var messageNodes = [];
        var fieldNodes = [];
        var duplicateFieldTagTokens = [];
        var errorMessages = [];

        for (var node in allNodes) {
            //Alle existierenden Nodes
            if (allNodes[node].rule === "messageBody") {
                //Alle Node, die messageBody sind
                messageNodes.push(allNodes[node]);
                fieldNodes.push([]);
            }
        }

        for (var node in messageNodes) {
            //Alle Nodes, die MessageBody sind
            for (var childNode in messageNodes[node].children) {
                //Alle direkten Kinder der MessageBodies
                if (messageNodes[node].children[childNode].rule === "field") {
                    //Alle direkten Kinder der MessageBodies, die Field sind
                    fieldNodes[node].push(messageNodes[node].children[childNode]);
                }
            }
        }

        for (var message in fieldNodes) {
            //Für alle gespeicherten MessageBodies
            var fieldNumbers = [];
            for (var fieldNode in fieldNodes[message]) {
                //Pro MessageBody alle FieldNodes            
                for (var names in fieldNodes[message][fieldNode].children) {
                    //Pro FieldNumber alle Kinder
                    if (fieldNodes[message][fieldNode].children[names].rule === "fieldNumber") {
                        //Falls ein FieldNode Kind eine FieldNumber ist
                        fieldNumbers.push(fieldNodes[message][fieldNode].children[names].children[0]);
                    }
                }

            }
            if (fieldNumbers.length > 1) {
                duplicateFieldTagTokens = duplicateFieldTagTokens.concat(this.check_duplicateTokens(fieldNumbers));
            }
        }
        for (var i = 0; i < duplicateFieldTagTokens.length; i++) {
            errorMessages.push("Duplicate message field tag '" +
                duplicateFieldTagTokens[i].value + "' in lines " + duplicateFieldTagTokens[i].line + " and " + duplicateFieldTagTokens[i + 1].line);
            i++;
        }

        return errorMessages;
    }



    /*messageUniqueIdentifierAnalyzation() {

        var allNodes = [];
        allNodes = this.tree.treeAsList(this.tree);
        var messageNodes = [];
        var fieldNodes = [];
        var duplicateFieldNameTokens = [];
        var errorMessages = [];

        for (var node in allNodes) {
            //Alle existierenden Nodes
            if (allNodes[node].rule === "messageBody") {
                //Alle Node, die messageBody sind
                messageNodes.push(allNodes[node]);
                fieldNodes.push([]);
            }
        }

        for (var node in messageNodes) {
            //Alle Nodes, die MessageBody sind
            for (var childNode in messageNodes[node].children) {
                //Alle direkten Kinder der MessageBodies
                if (messageNodes[node].children[childNode].rule === "field") {
                    //Alle direkten Kinder der MessageBodies, die Field sind
                    fieldNodes[node].push(messageNodes[node].children[childNode]);
                }
            }
        }

        for (var message in fieldNodes) {
            //Für alle gespeicherten MessageBodies
            var fieldNames = [];
            for (var fieldNode in fieldNodes[message]) {
                //Pro MessageBody alle FieldNodes            
                for (var names in fieldNodes[message][fieldNode].children) {
                    //Pro FieldNode alle Kinder
                    if (fieldNodes[message][fieldNode].children[names].rule === "fieldName") {
                        //Falls ein FieldNode Kind ein FieldName ist
                        fieldNames.push(fieldNodes[message][fieldNode].children[names].children[0]);
                    }
                }

            }
            if (fieldNames.length > 1) {
                duplicateFieldNameTokens = duplicateFieldNameTokens.concat(this.check_duplicateTokens(fieldNames));
            }
        }
        for (var i = 0; i < duplicateFieldNameTokens.length; i++) {
            errorMessages.push("Duplicate message field identifier '" +
                duplicateFieldNameTokens[i].value + "' in lines " + duplicateFieldNameTokens[i].line + " and " + duplicateFieldNameTokens[i + 1].line);
            i++;
        }

        return errorMessages;
    }*/


    check_duplicateTokens(tokenList) {
        tokenList.sort(function (a, b) {
            return a.value.localeCompare(b.value);
        });
        var duplicates = [];

        for (var i = 0; i < tokenList.length-1; i++) {


            if (tokenList[i].value === tokenList[i + 1].value) {
                duplicates.push(tokenList[i]);
                duplicates.push(tokenList[i + 1]);
            }

        }



        return duplicates;

    }
}