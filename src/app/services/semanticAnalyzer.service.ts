import { Token } from '../models/token';
import { ASTNode } from "../models/ASTNode";

export class SemanticAnalyzerService {

    tree: ASTNode;
    errors = [];

    initialize(tree) {
        this.tree = tree;
        this.errors = [];

    }



    analyze() {
        var uniqueIdentifierResult = this.messageUniqueTagsAnalyzation();
        this.errors = this.errors.concat(uniqueIdentifierResult);







        if(this.errors.length > 0){
            this.errors.unshift("failure");
        }else{
            this.errors.unshift("success");
        }

        return this.errors;

    }


    messageUniqueTagsAnalyzation() {

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
        console.log(duplicateFieldNameTokens);
        for(var i = 0;i < duplicateFieldNameTokens.length;i++){
            console.log(i);
            errorMessages.push("Duplicate message field identifier "+
                duplicateFieldNameTokens[i].value+" in lines "+duplicateFieldNameTokens[i].line+" and "+duplicateFieldNameTokens[i+1].line);
            i++;
        }

        return errorMessages;
    }


    check_duplicateTokens(tokenList) {
        
        tokenList.sort(function (a, b) {
            return a.value.localeCompare(b.value);
        });
        var duplicates = [];

        for(var i = 0;i < tokenList.length;i++){
            if (tokenList[i].value === tokenList[i + 1].value) {                
                duplicates.push(tokenList[i]);
                duplicates.push(tokenList[i + 1]);
            }
            if (i == tokenList.length - 2) {
                break;
            }
        }

        return duplicates;

    }
}