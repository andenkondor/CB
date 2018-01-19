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


    //Rufe alle Regeln hintereinander auf
    //Konkateniere ihre Fehlermeldungen
    analyze() {
        this.errors = this.errors.concat(this.scopeUnknownTypes());
        this.errors = this.errors.concat(this.enumTagRange());
        this.errors = this.errors.concat(this.enumStartswithZero());
        this.errors = this.errors.concat(this.messageUniqueTagsAnalyzation());
        this.errors = this.errors.concat(this.messageTagValueAnalyzation());
        this.errors = this.errors.concat(this.scopeDoubleIdentifiers(true, null));
        this.errors = this.errors.concat(this.doubleEnumTagAnalyzation());




        //Mind. eine Fehlermeldung vorhanden
        if (this.errors.length > 0) {
            this.errors.unshift("failure");
            //Keine Fehlermeldung
        } else {
            this.errors.unshift("success");
        }

        return this.errors;

    }

    //Prüft, ob alle nicht-standard Datentypen vorher definiert wurden
    scopeUnknownTypes() {
        var scope = new ScopeNode();
        scope.name = "start";
        //Initialisiere Scope
        scope = this.getScope(this.tree, scope);
        var errorMessages = [];
        var allScopes = [];
        allScopes = scope.treeAsList(scope);


        //Für jeden Scope
        for (var idx in allScopes) {
            errorMessages = errorMessages.concat(this.lookForTypes(allScopes[idx], allScopes[idx].typeNodes));
        }

        return errorMessages;


    }

    //Prüfe rekursiv, ob alle Typen eines Arrays in einem Scope
    //oder den darüberliegenden Scopes definiert wurden
    //Gehe dabei nur baumaufwärts
    lookForTypes(scope: ScopeNode, types) {

        //Für jeden Typ im Array
        for (var i = types.length - 1; i >= 0; i--) {
            //Jeden Bezeichner im Scope
            for (var identifier in scope.nameNodes) {
                //Falls ein Typ mit einem Bezeichner übereinstimmt
                if (types[i].value === scope.nameNodes[identifier].value) {
                    //Typ muss nicht mehr gesucht werden
                    //Lösche Typ aus Array
                    types.splice(i, 1);
                    break;
                }
            }
        }

        //Falls ich noch Bezeichner für Typen finden muss, aber schon in der Wurzel angekommen bin:
        //Fehlermeldung
        if (types && types.length > 0 && !scope.parent) {
            var errorMessages = [];
            for (var type in types) {
                errorMessages.push("Cannot resolve Type " + types[type].value + " at line " + types[type].line + " and index " + types[type].index);
            }
            return errorMessages;

            //Falls ich alles Typen über Bezeichner finden konnte:
        } else if (!types || types.length == 0) {
            return [];

            //Falls ich noch Bezeichner für Typen auffinden muss und es noch einen höhergelegeneren Scope gibt:
            //Schaue rekursiv in diesem Scope nach Bezeichnern für meine Typen
        } else {
            return this.lookForTypes(scope.parent, types);
        }

    }
    //Sucht nach rekursiv doppelten Identifiern innerhalb eines Scopes
    scopeDoubleIdentifiers(init, scope: ScopeNode) {
        if (init) {
            scope = new ScopeNode();
            scope.name = "start";
            scope = this.getScope(this.tree, scope);
        }
        var errormessages = [];
        var identifiers = [];

        //Für jeden einzelnen Scope:
        //Merke mir alle Bezeichner
        for (var token in scope.nameNodes) {
            if (scope.nameNodes[token].token === "Identifier") {
                identifiers.push(scope.nameNodes[token]);
            }
        }

        //Mehr als ein Bezeichner in Scope:
        //Prüfe, pb Duplikate
        if (identifiers.length > 1) {
            identifiers = this.check_duplicateTokens(identifiers);

            //Für jedes Duplikat:
            //Erstelle Fehlermeldung
            for (var i = 0; i < identifiers.length; i++) {
                errormessages.push("Duplicate identifier '" +
                    identifiers[i].value + "' in lines " + identifiers[i].line + " and " + identifiers[i + 1].line);
                i++;
            }
        }


        //Führe dieselbe Routine für alle meine Kinder aus
        for (var child in scope.children) {
            errormessages = errormessages.concat(this.scopeDoubleIdentifiers(false, scope.children[child]));
        }

        return errormessages;


    }

    //Beschaffe mir rekursiv die Scopes in meinem Parse-Tree
    getScope(tree: ASTNode, scopes: ScopeNode) {

        //Für jeden Knoten
        for (var child in tree.children) {
            //Stellt Knoten Bezeichner dar:
            //Speichere ihn für aktuellen Scope in Bezeichnerliste
            if (tree.children[child].rule === "enumName" ||
                tree.children[child].rule === "messageName" ||
                tree.children[child].rule === "fieldName" ||
                tree.children[child].rule === "enumFieldName") {
                scopes.nameNodes.push(tree.children[child].children[0]);
                //Stellt Knoten Typ dar:
                //Speichere ihn für aktuellen Scope in Typenliste
            } else if (tree.children[child].rule === "messageOrEnumType") {
                scopes.typeNodes.push(tree.children[child].children[0]);
                //Wird neuer MessageScope aufgemacht:
                //Erstelle neuen ScopeNode und hänge ihn ein
                //Fahre dann rekursiv fort
            } else if (tree.children[child].rule === "messageBody") {
                var newScope: ScopeNode = new ScopeNode();
                newScope.addParent(scopes);
                scopes.addChild(newScope);
                newScope.name = "messageScope";
                this.getScope(tree.children[child], newScope);
                //Wird neuer EnumScope aufgemacht:
                //Erstelle neuen ScopeNode und hänge ihn ein
                //Fahre dann rekursiv fort
            } else if (tree.children[child].rule === "enumBody") {
                var newScope: ScopeNode = new ScopeNode();
                newScope.addParent(scopes);
                scopes.addChild(newScope);
                newScope.name = "enumScope";
                this.getScope(tree.children[child], newScope);
              //Falls kein Scope-relevanter Regel-Knoten:
              //Führe Prozedur rekursiv für seine Kinder aus
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
                    if (bodyNodes[idx].children[child].children[2].rule === "enumFieldTag") {
                        //Falls 1. Tag nicht mit 0 startet
                        if (bodyNodes[idx].children[child].children[2].children[0].value != 0) {
                            errorMessages.push("First Field Tag '" + bodyNodes[idx].children[child].children[2].children[0].value + "' in Enum in line " +
                                bodyNodes[idx].children[child].children[2].children[0].line + " and at index " + bodyNodes[idx].children[child].children[2].children[0].index +
                                " does not equal zero.");

                        }
                        //Falls 1. Tag nicht mit 0 startet
                    } else if (bodyNodes[idx].children[child].children[3].children[0].value != 0) {
                        errorMessages.push("First Field Tag '" + bodyNodes[idx].children[child].children[3].children[0].value + "' in Enum in line " +
                            bodyNodes[idx].children[child].children[3].children[0].line + " and at index " + bodyNodes[idx].children[child].children[3].children[0].index +
                            " does not equal zero.");

                    }



                    break;
                }
            }


        }

        return errorMessages;

    }

    //Prüft, ob alle Enum-Tags in korrekter Range
    enumTagRange() {

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
                    if (bodyNodes[idx].children[child].children[2].rule === "enumFieldTag") {
                        //Falls Tag nicht in korrekter Range
                        if (bodyNodes[idx].children[child].children[2].children[0].value > 4294967295 ||
                            bodyNodes[idx].children[child].children[2].children[0].value < 0) {
                            errorMessages.push("Field Tag '" + bodyNodes[idx].children[child].children[2].children[0].value + "' in Enum in line " +
                                bodyNodes[idx].children[child].children[2].children[0].line + " and at index " + bodyNodes[idx].children[child].children[2].children[0].index +
                                " is out of range (0-4294967295).");

                        }
                    } else {
                        //Falls Tag nicht in korrekter Range
                        if (bodyNodes[idx].children[child].children[3].children[0].value > 4294967295 ||
                            bodyNodes[idx].children[child].children[3].children[0].value < 0) {
                            errorMessages.push("Field Tag '" + bodyNodes[idx].children[child].children[3].children[0].value + "' in Enum in line " +
                                bodyNodes[idx].children[child].children[3].children[0].line + " and at index " + bodyNodes[idx].children[child].children[3].children[0].index +
                                " is out of range (0-4294967295).");

                        }


                    }

                }
            }


        }

        return errorMessages;

    }

    //Prüft, ob alle Enum-Tags einzigartig
    doubleEnumTagAnalyzation() {

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
            //Falls mehr als ein Tag gefunden:
            //Prüfe, ob Duplikate
            if (tagNumbers.length > 1) {
                duplicateTags = duplicateTags.concat(this.check_duplicateTokens(tagNumbers));
            }

        }
        //Für jedes Duplikat Fehlermeldung
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
                        //Tag außerhalb von Range
                        if (tagToken.value < 1 || tagToken.value > 536870911) {
                            errorMessages.push("Message Field Tag '" + tagToken.value + "' in line " + tagToken.line + " and at index " + tagToken.index + " is out of range (1-536870911).");
                            //Tag in reservierter Range
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





    //Finde Duplikate in Array durch Ordnen der Werte
    check_duplicateTokens(tokenList) {
        tokenList.sort(function (a, b) {
            return a.value.localeCompare(b.value);
        });
        var duplicates = [];

        for (var i = 0; i < tokenList.length - 1; i++) {


            if (tokenList[i].value === tokenList[i + 1].value) {
                duplicates.push(tokenList[i]);
                duplicates.push(tokenList[i + 1]);
            }

        }



        return duplicates;

    }
}
