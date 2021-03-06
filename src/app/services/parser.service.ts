import { Token } from '../models/token';
import { ASTNode } from '../models/ASTNode';

export class ParserService {

    tokens = [];
    ringbuffer = [];
    position = 0;
    lookahead;
    lastErrorInformation = [];
    tokenSizeHistory;

    //Setze alle Einstellungen auf Anfang zurück
    initialize(tokens, lookahead) {
        this.ringbuffer = [];
        this.tokens = tokens;
        this.lookahead = lookahead;
        this.position = 0;

        //Keine Token zum Verarbeiten
        if (this.tokens.length < 1) {
            throw { name: "NoTokensLeftError", message: "No Tokens for Parsing supplied" };
        }
        //Fülle Ringpuffer mit Token auf bis Lookahead erreicht
        for (var i = 0; i < this.lookahead; i++) {
            if (this.tokensLeft()) {
                this.ringbuffer.push(this.tokens[0]);
                this.tokens.shift();
            }
        }

        this.tokenSizeHistory = this.tokens.length;
        this.lookahead = this.ringbuffer.length;

    }

    //Eliminiere aktuelles Token und lade nächstes Token nach
    consume() {
        //Falls noch Token in Tokenliste
        //Einfach nachfüllen
        if (this.tokensLeft()) {
            this.ringbuffer[this.position] = this.tokens[0];
            this.tokens.shift();
            this.position = (this.position + 1) % this.lookahead;
        
        //Tokenliste leer
        } else {
            //Falls keine Elemente mehr in Tokenliste
            //Lösche aktuelles Element aus Ringbuffer
            //und verringere Ringbuffer-Größe um eins
            if (this.ringbuffer.length >= 1) {
                if (this.position == this.lookahead - 1) {
                    this.position = 0
                    this.ringbuffer.splice(this.lookahead - 1, 1);
                } else {
                    this.ringbuffer.splice(this.position, 1);
                }
                this.lookahead--;
            //Weder Token im Ringpuffer noch in Tokenliste
            //Null-Token zurückliefern
            } else if (this.ringbuffer.length == 0) {
                var emptyToken: Token = new Token("NULL", "");
                return emptyToken;
            }
        }
    }


    //Beschaffe Lookahead-Token, falls Token vorhanden. Sonst Null-Token
    getLookaheadToken(lookahead) {
        if (lookahead <= this.lookahead) {
            if (this.lookaheadLeft()) {
                return this.ringbuffer[(this.position + lookahead - 1) % this.lookahead];
            } else {
                var emptyToken: Token = new Token("NULL", "");
                return emptyToken;
            }
        }else{
            throw { name: "LookAheadTooHigh", message: "The maximal LookAhead can be"+this.lookahead };
        }

    }

    //Prüfe, ob vorhandenes Token mit vorgegebenem übereinstimmt
    match(tokenName, node: ASTNode) {
        //Übereinstimmung
        if (this.getLookaheadToken(1).name === tokenName) {

            //Erstelle neuen Parse-Tree-Knoten und hänge diesen ein
            var tokenNode: ASTNode = new ASTNode("", tokenName);
            tokenNode.value = this.getLookaheadToken(1).value;
            tokenNode.line = this.getLookaheadToken(1).line;
            tokenNode.index = this.getLookaheadToken(1).index;
            node.addChild(tokenNode);
            this.consume();
        //Keine Übereinstimmung
        } else {
            //Falls das am weitesten hinten liegende Token
            //Speichere Token für Fehlermeldung
            if (this.tokens.length <= this.tokenSizeHistory) {
                this.tokenSizeHistory = this.tokens.length;
                this.lastErrorInformation = [];
                this.lastErrorInformation.push(tokenName) //[0] Muss ich
                this.lastErrorInformation.push(this.getLookaheadToken(1)) //[1] Hab ich
            }
            throw { name: "NoTokenMatchError", message: "Token found " + this.getLookaheadToken(1).name + ". Token needed: " + tokenName };

        }
    }


    lookaheadLeft() {
        return (this.ringbuffer.length > 0);
    }

    tokensLeft() {
        return (this.tokens.length > 0);
    }


    //Starte Parsing mit leerem Knoten
    
    parsing() {
        var result = [];
        var startNode: ASTNode = new ASTNode("start", "");
        try {
            this.protoStart(startNode);
            //Parsing erfolgreich
            result.push(startNode);
            result.push("success");
        } catch (e) {
            //Fehler: Parsing nicht erfolgreich
            console.log(e.name + ": " + e.message);
            if (e.name === "NoTokenMatchError") {
                result.push("failure");
                result.push("match");
                result.push(this.lastErrorInformation)
            } else {
                throw e;
            }
        }
        return result;
    }








    protoStart(node: ASTNode) {


        this.syntax(node);

        var backup_node = node.copy();

        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            while (true) {
                backup_position = this.position;
                backup_ringbuffer = this.ringbuffer.slice();
                backup_tokens = this.tokens.slice();
                backup_lookahead = this.lookahead;
                if (this.spec_import()) {
                    this.import(node);
                } else if (this.spec_package()) {
                    this.package(node);
                } else if (this.spec_option()) {
                    this.option(node);
                } else if (this.spec_toplevel()) {
                    this.toplevel(node);
                } else {
                    this.empty(node);
                }

                backup_node = node.copy();

            }
        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;

            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            this.match("EOF", backup_node);
        } finally {

            node = backup_node.copy();
        }


    }

    syntax(node: ASTNode) {
        var syntaxNode: ASTNode = new ASTNode("syntax", "");

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
                throw { name: "NoTokenMatchError", message: "No Token matches input" };
        }

        this.match("SEMI", syntaxNode);
        node.addChild(syntaxNode);
    }


    spec_import() {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;

        try {
            this.import();
        } catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            } else {
                throw e;
            }
        } finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;

            return success;
        }


    }

    spec_package() {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;


        try {
            this.package();
        } catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            } else {
                throw e;
            }
        } finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            return success;
        }

    }

    spec_option() {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;


        try {
            this.option();
        } catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            } else {
                throw e;
            }
        } finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;

            return success;
        }

    }
    spec_toplevel() {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;


        try {
            this.toplevel();
        } catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            } else {
                throw e;
            }
        } finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;

            return success;
        }

    }




    import(node: ASTNode = null) {
        var importNode: ASTNode = new ASTNode("import", "");

        this.match("IMPORT", importNode);

        var nextToken = this.getLookaheadToken(1);

        switch (nextToken.name) {
            case "WEAK":
                this.match("WEAK", importNode);
                break;
            case "PUBLIC":
                this.match("PUBLIC", importNode);
                break;
        }

        this.match("StringLiteral", importNode);
        this.match("SEMI", importNode);

        if (node) {
            node.addChild(importNode);
        }


    }

    package(node: ASTNode = null) {
        var packageNode: ASTNode = new ASTNode("package", "");
        this.match("PACKAGE", packageNode);
        this.fullIdentifier(packageNode);
        this.match("SEMI", packageNode);
        if (node) {
            node.addChild(packageNode);
        }
    }

    option(node: ASTNode = null) {
        var optionNode: ASTNode = new ASTNode("option", "");
        this.match("OPTION", optionNode);
        this.optionName(optionNode);
        this.match("ASSIGN", optionNode);
        this.constant(optionNode);
        this.match("SEMI", optionNode);

        if (node) {
            node.addChild(optionNode);
        }
    }

    toplevel(node: ASTNode = null) {
        var toplevelNode: ASTNode = new ASTNode("toplevel", "");

        var nextToken = this.getLookaheadToken(1);
        if (nextToken.name === "MESSAGE") {
            this.message(toplevelNode);
        } else if (nextToken.name === "ENUM") {
            this.enumDefinition(toplevelNode);
        } else {
            this.service(toplevelNode);
        }

        if (node) {
            node.addChild(toplevelNode);
        }
    }

    empty(node: ASTNode = null) {
        var emptyNode: ASTNode = new ASTNode("empty", "");
        this.match("SEMI", emptyNode);
        if (node) {
            node.addChild(emptyNode);
        }
    }

    fullIdentifier(node: ASTNode) {
        var fullIdentNode: ASTNode = new ASTNode("fullIdent", "");
        this.match("Identifier", fullIdentNode);


        var nextToken = this.getLookaheadToken(1);
        var nextNextToken = this.getLookaheadToken(1);

        while (true) {
            if (nextToken.name === "DOT" && nextToken.name === "Identifier") {
                this.match("DOT", fullIdentNode);
                this.match("Identifier", fullIdentNode);
            } else {
                break;
            }
        }
        node.addChild(fullIdentNode);
    }

    optionName(node: ASTNode) {
        var optionNode: ASTNode = new ASTNode("optionName", "");

        var nextToken = this.getLookaheadToken(1);

        switch (nextToken.name) {
            case "Identifier":
                this.match("Identifier", optionNode);
                break;
            case "LPAREN":
                this.match("LPAREN", optionNode);
                this.fullIdentifier(optionNode);
                this.match("RPAREN", optionNode);
                break;
            default:
                throw { name: "NoTokenMatchError", message: "Token does not match input" };
        }


        while (true) {
            nextToken = this.getLookaheadToken(1);
            var nextNextToken = this.getLookaheadToken(2);
            if (nextToken.name === "DOT" && nextNextToken.name === "Identifier") {
                this.match("DOT", optionNode);
                this.match("Identifier", optionNode);
            } else {
                break;
            }
        }
        node.addChild(optionNode);
    }

    constant(node: ASTNode) {
        var constantNode: ASTNode = new ASTNode("constant", "");

        var nextToken = this.getLookaheadToken(1);

        switch (nextToken.name) {
            case "Identifier":
                this.fullIdentifier(constantNode);
                break;
            case "MINUS":
                var nextToken = this.getLookaheadToken(2);
                switch (nextToken.name) {
                    case "IntegerLiteral":
                        this.match("MINUS", constantNode);
                        this.match("IntegerLiteral", constantNode);
                        break;
                    case "FloatLiteral":
                        this.match("MINUS", constantNode);
                        this.match("FloatLiteral", constantNode);
                        break;
                    default:
                        throw { name: "NoTokenMatchError", message: "Token does not match input" };
                }
            case "PLUS":
                var nextToken = this.getLookaheadToken(2);
                switch (nextToken.name) {
                    case "IntegerLiteral":
                        this.match("PLUS", constantNode);
                        this.match("IntegerLiteral", constantNode);
                        break;
                    case "FloatLiteral":
                        this.match("PLUS", constantNode);
                        this.match("FloatLiteral", constantNode);
                        break;
                    default:
                        throw { name: "NoTokenMatchError", message: "Token does not match input" };
                }
            case "StringLiteral":
                this.match("StringLiteral", constantNode);
                break;
            case "TRUE":
                this.match("TRUE", constantNode);
                break;
            case "FALSE":
                this.match("FALSE", constantNode);
                break;
            default:
                throw { name: "NoTokenMatchError", message: "Token does not match input" };
        }

        node.addChild(constantNode);

    }

    spec_message() {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;


        try {
            this.message();
        } catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            } else {
                throw e;
            }
        } finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;

            return success;
        }
    }

    message(node: ASTNode = null) {
        var messageNode: ASTNode = new ASTNode("message", "");
        this.match("MESSAGE", messageNode);
        this.messageName(messageNode);
        this.messageBody(messageNode);
        if (node) {
            node.addChild(messageNode);
        }

    }

    messageBody(node: ASTNode) {
        var messageBodyNode: ASTNode = new ASTNode("messageBody", "");

        this.match("LBRACE", messageBodyNode);


        var backup_messageBodyNode = messageBodyNode.copy();
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            while (true) {

                backup_position = this.position;
                backup_ringbuffer = this.ringbuffer.slice();
                backup_tokens = this.tokens.slice();
                backup_lookahead = this.lookahead;
                if (this.spec_field()) {
                    this.field(messageBodyNode);
                } else if (this.spec_enum()) {
                    this.enumDefinition(messageBodyNode);
                } else if (this.spec_message()) {
                    this.message(messageBodyNode);
                } else if (this.spec_option()) {
                    this.option(messageBodyNode);
                } else if (this.spec_oneof()) {
                    this.oneof(messageBodyNode);
                } else if (this.spec_mapField()) {
                    this.mapField(messageBodyNode);
                } else if (this.spec_reserved()) {
                    this.reserved(messageBodyNode);
                } else {
                    this.empty(messageBodyNode);
                }
                backup_messageBodyNode = messageBodyNode.copy();
            }
        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;

            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            this.match("RBRACE", backup_messageBodyNode);
        } finally {

            node.addChild(backup_messageBodyNode);
        }






    }


    spec_field() {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;


        try {
            this.field();
        } catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            } else {
                throw e;
            }
        } finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;

            return success;
        }
    }

    spec_enum() {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;


        try {
            this.enumDefinition();
        } catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            } else {
                throw e;
            }
        } finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;

            return success;
        }
    }

    field(node: ASTNode = null) {
        var fieldNode: ASTNode = new ASTNode("field", "");

        var nextToken = this.getLookaheadToken(1);

        if (nextToken.name == "REPEATED") {
            this.match("REPEATED", fieldNode);
        }

        this.type(fieldNode);
        this.fieldName(fieldNode);
        this.match("ASSIGN", fieldNode);
        this.fieldNumber(fieldNode);

        nextToken = this.getLookaheadToken(1);

        if (nextToken.name == "LBRACK") {
            this.match("LBRACK", fieldNode);
            this.fieldOptions(fieldNode);
            this.match("RBRACK", fieldNode);
        }
        this.match("SEMI", fieldNode);

        if (node) {
            node.addChild(fieldNode);

        }


    }

    type(node: ASTNode) {
        var typeNode: ASTNode = new ASTNode("type", "");

        var nextToken = this.getLookaheadToken(1);
        switch (nextToken.name) {
            case "DOUBLE":
                this.match("DOUBLE", typeNode);
                break;
            case "FLOAT":
                this.match("FLOAT", typeNode);
                break;
            case "INT32":
                this.match("INT32", typeNode);
                break;
            case "INT64":
                this.match("INT64", typeNode);
                break;
            case "UINT32":
                this.match("UINT32", typeNode);
                break;
            case "UINT64":
                this.match("UINT64", typeNode);
                break;
            case "SINT32":
                this.match("SINT32", typeNode);
                break;
            case "SINT64":
                this.match("SINT64", typeNode);
                break;
            case "FIXED32":
                this.match("FIXED32", typeNode);
                break;
            case "FIXED64":
                this.match("FIXED64", typeNode);
                break;
            case "BOOL":
                this.match("BOOL", typeNode);
                break;
            case "STRING":
                this.match("STRING", typeNode);
                break;
            case "SFIXED32":
                this.match("SFIXED32", typeNode);
                break;
            case "SFIXED64":
                this.match("SFIXED64", typeNode);
                break;
            case "BYTES":
                this.match("BYTES", typeNode);
                break;
            default:
                this.messageOrEnumType(typeNode);


        }

        node.addChild(typeNode);



    }


    keyType(node: ASTNode) {
        var keyTypeNode: ASTNode = new ASTNode("keyType", "");

        var nextToken = this.getLookaheadToken(1);
        switch (nextToken.name) {
            case "INT32":
                this.match("INT32", keyTypeNode);
                break;
            case "INT64":
                this.match("INT64", keyTypeNode);
                break;
            case "UINT32":
                this.match("UINT32", keyTypeNode);
                break;
            case "UINT64":
                this.match("UINT64", keyTypeNode);
                break;
            case "SINT32":
                this.match("SINT32", keyTypeNode);
                break;
            case "SINT64":
                this.match("SINT64", keyTypeNode);
                break;
            case "FIXED32":
                this.match("FIXED32", keyTypeNode);
                break;
            case "FIXED64":
                this.match("FIXED64", keyTypeNode);
                break;
            case "BOOL":
                this.match("BOOL", keyTypeNode);
                break;
            case "STRING":
                this.match("STRING", keyTypeNode);
                break;
            case "SFIXED32":
                this.match("SFIXED32", keyTypeNode);
                break;
            case "SFIXED64":
                this.match("SFIXED64", keyTypeNode);
                break;
            default:
                throw { name: "NoTokenMatchError", message: "No Token matches input" };

        }

        node.addChild(keyTypeNode);



    }

    messageOrEnumType(node: ASTNode) {
        var messageOrEnumNode: ASTNode = new ASTNode("messageOrEnumType", "");

        var nextToken = this.getLookaheadToken(1);

        if (nextToken.name == "DOT") {
            this.match("DOT", messageOrEnumNode);
        }

        while (true) {
            nextToken = this.getLookaheadToken(1);
            var nextNextToken = this.getLookaheadToken(2);
            if (nextToken.name === "Identifier" && nextNextToken.name === "DOT") {
                this.match("Identifier", messageOrEnumNode);
                this.match("DOT", messageOrEnumNode);
            } else {
                break;
            }
        }
        this.match("Identifier", messageOrEnumNode);
        node.addChild(messageOrEnumNode);




    }

    fieldOptions(node: ASTNode) {
        var fieldOptionsNode: ASTNode = new ASTNode("fieldOptions", "");

        this.fieldOption(fieldOptionsNode);
        var backup_fieldOptionsNode = fieldOptionsNode.copy();
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            while (true) {

                backup_position = this.position;
                backup_ringbuffer = this.ringbuffer.slice();
                backup_tokens = this.tokens.slice();
                backup_lookahead = this.lookahead;
                this.match("COMMA", fieldOptionsNode);
                this.fieldOption(fieldOptionsNode);
                backup_fieldOptionsNode = fieldOptionsNode.copy();
            }
        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;

            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
        } finally {
            node.addChild(backup_fieldOptionsNode);
        }


    }

    fieldOption(node: ASTNode) {
        var fieldOptionNode: ASTNode = new ASTNode("fieldOption", "");

        this.optionName(fieldOptionNode);
        this.match("ASSIGN", fieldOptionNode);
        this.constant(fieldOptionNode);
        node.addChild(fieldOptionNode);
    }


    enumDefinition(node: ASTNode = null) {
        var enumDefinitionNode: ASTNode = new ASTNode("enumDefinition", "");

        this.match("ENUM", enumDefinitionNode);
        this.enumName(enumDefinitionNode);
        this.enumBody(enumDefinitionNode);

        if (node) {
            node.addChild(enumDefinitionNode);
        }

    }

    enumBody(node: ASTNode) {
        var enumBodyNode: ASTNode = new ASTNode("enumBody", "");

        this.match("LBRACE", enumBodyNode);
        var backup_enumBodyNode = enumBodyNode.copy();
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;

        try {
            while (true) {

                backup_position = this.position;
                backup_ringbuffer = this.ringbuffer.slice();
                backup_tokens = this.tokens.slice();
                backup_lookahead = this.lookahead;


                var nextToken = this.getLookaheadToken(1);

                if (nextToken.name === "SEMI") {
                    this.empty(enumBodyNode);
                } else if (nextToken.name === "OPTION") {
                    this.option(enumBodyNode);
                } else { this.enumField(enumBodyNode); }

                backup_enumBodyNode = enumBodyNode.copy();
            }
        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;
            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;

        } finally {

            this.match("RBRACE", backup_enumBodyNode);
            node.addChild(backup_enumBodyNode);
        }

    }

    enumField(node: ASTNode) {
        var enumFieldNode: ASTNode = new ASTNode("enumField", "");

        this.enumFieldName(enumFieldNode);
        this.match("ASSIGN", enumFieldNode);

        var nextToken = this.getLookaheadToken(1);

        if (nextToken.name === "MINUS") {
            this.match("MINUS", enumFieldNode);
        }

        this.enumFieldTag(enumFieldNode);

        var backup_enumFieldNode = enumFieldNode.copy();
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            this.match("LBRACK", enumFieldNode)
            this.fieldOption(enumFieldNode);
            backup_enumFieldNode = enumFieldNode.copy();
            try {
                while (true) {
                    backup_position = this.position;
                    backup_ringbuffer = this.ringbuffer.slice();
                    backup_tokens = this.tokens.slice();
                    backup_lookahead = this.lookahead;
                    this.match("COMMA", enumFieldNode);
                    this.fieldOption(enumFieldNode);
                    backup_enumFieldNode = enumFieldNode.copy();
                }

            } catch (e) {
                if (e.name != "NoTokenMatchError") {
                    throw e;
                }
                this.position = backup_position;
                this.ringbuffer = backup_ringbuffer.slice();
                this.tokens = backup_tokens.slice();
                this.lookahead = backup_lookahead;
                this.match("RBRACK", backup_enumFieldNode);

            }

        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;
            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            this.match("SEMI", backup_enumFieldNode);
        }finally{

        node.addChild(backup_enumFieldNode);
        }



    }

    spec_oneof() {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;


        try {
            this.oneof();
        } catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            } else {
                throw e;
            }
        } finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;

            return success;
        }
    }


    oneof(node: ASTNode = null) {
        var oneofNode: ASTNode = new ASTNode("oneof", "");

        this.match("ONEOF", oneofNode);
        this.match("Identifier", oneofNode);
        this.match("LBRACE", oneofNode);

        var backup_oneofNode = oneofNode.copy();
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;

        try {
            while (true) {

                backup_position = this.position;
                backup_ringbuffer = this.ringbuffer.slice();
                backup_tokens = this.tokens.slice();
                backup_lookahead = this.lookahead;

                var nextToken = this.getLookaheadToken(1);

                if (nextToken.name === "SEMI") {
                    this.empty(oneofNode);
                } else {
                    this.oneofField(oneofNode);
                }
                backup_oneofNode = oneofNode.copy();
            }
        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;

            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            this.match("RBRACK", backup_oneofNode);


        } finally {
            if (node) {
                node.addChild(backup_oneofNode);
            }
        }






    }



    oneofField(node: ASTNode) {
        var oneofFieldNode: ASTNode = new ASTNode("oneofField", "");

        this.type(oneofFieldNode);
        this.fieldName(oneofFieldNode);
        this.match("ASSIGN", oneofFieldNode);
        this.fieldNumber(oneofFieldNode);
        this.match("LBRACK", oneofFieldNode);

        var backup_oneofFieldNode = oneofFieldNode.copy();
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;

        try {
            while (true) {
                backup_position = this.position;
                backup_ringbuffer = this.ringbuffer.slice();
                backup_tokens = this.tokens.slice();
                backup_lookahead = this.lookahead;
                this.match("COMMA", oneofFieldNode);
                this.fieldOption(oneofFieldNode);
                backup_oneofFieldNode = oneofFieldNode.copy();
            }
        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;

            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            this.match("RBRACK", oneofFieldNode);


        } finally {
            node.addChild(backup_oneofFieldNode);
        }

    }

    mapField(node: ASTNode = null) {
        var mapFieldNode: ASTNode = new ASTNode("mapField", "");

        this.match("MAP", mapFieldNode);
        this.match("LCHEVR", mapFieldNode);
        this.keyType(mapFieldNode);
        this.match("COMMA", mapFieldNode);
        this.type(mapFieldNode);
        this.match("RCHEVR", mapFieldNode);
        this.match("Identifier", mapFieldNode);
        this.match("ASSIGN", mapFieldNode);
        this.match("IntegerLiteral", mapFieldNode);

        var backup_mapFieldNode = mapFieldNode.copy();
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;

        try {
            this.match("LBRACK", mapFieldNode);
            this.fieldOptions(mapFieldNode);
            this.match("RBRACK", mapFieldNode);
            backup_mapFieldNode = mapFieldNode.copy();
        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;

            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;


        } finally {
            this.match("SEMI", backup_mapFieldNode);
            if (node) {
                node.addChild(backup_mapFieldNode);
            }
        }




    }


    spec_mapField() {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;

        try {
            this.mapField();
        } catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            } else {
                throw e;
            }
        } finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;

            return success;
        }


    }

    spec_reserved() {
        var success = true;
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;


        try {
            this.reserved();
        } catch (e) {
            if (e.name == "NoTokenMatchError") {
                success = false;
            } else {
                throw e;
            }
        } finally {
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;

            return success;
        }
    }




    reserved(node: ASTNode = null) {
        var reservedNode: ASTNode = new ASTNode("reservedField", "");
        this.match("RESERVED", reservedNode);

        var nextToken = this.getLookaheadToken(1);

        if (nextToken.name === "IntegerLiteral") {
            this.ranges(reservedNode);
        } else {
            this.fieldNames(reservedNode);
        }

        this.match("SEMI", reservedNode);

        if (node) {
            node.addChild(reservedNode);
        }

    }


    ranges(node: ASTNode) {
        var rangesNode: ASTNode = new ASTNode("ranges", "");

        this.range(rangesNode);
        var backup_rangesNode = rangesNode.copy();
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            while (true) {
                backup_position = this.position;
                backup_ringbuffer = this.ringbuffer.slice();
                backup_tokens = this.tokens.slice();
                backup_lookahead = this.lookahead;
                this.match("COMMA", rangesNode);
                this.range(rangesNode);
                backup_rangesNode = rangesNode.copy();
            }
        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;

            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
        } finally {
            node.addChild(backup_rangesNode);
        }


    }

    range(node: ASTNode) {
        var rangeNode: ASTNode = new ASTNode("range", "");

        var nextToken = this.getLookaheadToken(1);
        var nextNextToken = this.getLookaheadToken(2);

        if (nextToken.name == "IntegerLiteral" && nextNextToken.name == "TO") {
            this.match("IntegerLiteral", rangeNode);
            this.match("TO", rangeNode);
            nextToken = this.getLookaheadToken(1);
            if (nextToken.name == "IntegerLiteral") {
                this.match("IntegerLiteral", rangeNode);
            } else {
                this.match("MAX", rangeNode);
            }
        } else {
            this.match("IntegerLiteral", rangeNode);
        }

        node.addChild(rangeNode);


    }

    fieldNames(node: ASTNode) {
        var fieldNamesNode: ASTNode = new ASTNode("fieldNames", "");

        this.match("StringLiteral", fieldNamesNode);
        var backup_fieldNamesNode = fieldNamesNode.copy();
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            while (true) {
                backup_position = this.position;
                backup_ringbuffer = this.ringbuffer.slice();
                backup_tokens = this.tokens.slice();
                backup_lookahead = this.lookahead;
                this.match("COMMA", fieldNamesNode);
                this.match("StringLiteral", fieldNamesNode);
                backup_fieldNamesNode = fieldNamesNode.copy();
            }
        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;

            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
        } finally {
            node.addChild(backup_fieldNamesNode);
        }


    }

    service(node: ASTNode) {
        var serviceNode: ASTNode = new ASTNode("service", "");

        this.match("SERVICE", serviceNode);
        this.match("Identifier", serviceNode);
        this.match("LBRACE", serviceNode);

        var backup_serviceNode = serviceNode.copy();
        var backup_position = this.position;
        var backup_ringbuffer = this.ringbuffer.slice();
        var backup_tokens = this.tokens.slice();
        var backup_lookahead = this.lookahead;
        try {
            while (true) {
                var nextToken = this.getLookaheadToken(1);
                backup_position = this.position;
                backup_ringbuffer = this.ringbuffer.slice();
                backup_tokens = this.tokens.slice();
                backup_lookahead = this.lookahead;
                if (nextToken.name === "OPTION") {
                    this.option(serviceNode);
                } else if (nextToken.name === "RPC") {
                    this.rpc(serviceNode);
                } else {
                    this.empty(serviceNode);
                }


                backup_serviceNode = serviceNode.copy();
            }
        } catch (e) {
            if (e.name != "NoTokenMatchError") {
                throw e;

            }
            this.position = backup_position;
            this.ringbuffer = backup_ringbuffer.slice();
            this.tokens = backup_tokens.slice();
            this.lookahead = backup_lookahead;
            this.match("RBRACE", serviceNode);
        } finally {
            node.addChild(backup_serviceNode);
        }




    }

    rpc(node: ASTNode) {
        var rpcNode: ASTNode = new ASTNode("rpc", "");

        this.match("RPC", rpcNode);
        this.match("Identifier", rpcNode);
        this.match("LPAREN", rpcNode);

        var nextToken = this.getLookaheadToken(1);

        if (nextToken.name === "STREAM") {
            this.match("STREAM", rpcNode);
        }

        this.messageType(rpcNode);
        this.match("RPAREN", rpcNode);

        this.match("RETURNS", rpcNode);
        this.match("LPAREN", rpcNode);

        nextToken = this.getLookaheadToken(1);
        if (nextToken.name === "STREAM") {
            this.match("STREAM", rpcNode);
        }
        this.messageType(rpcNode);
        this.match("RPAREN", rpcNode);

        nextToken = this.getLookaheadToken(1);
        if (nextToken.name === "SEMI") {
            this.match("SEMI", rpcNode);
        } else {
            var backup_rpcNode = rpcNode.copy();
            var backup_position = this.position;
            var backup_ringbuffer = this.ringbuffer.slice();
            var backup_tokens = this.tokens.slice();
            var backup_lookahead = this.lookahead;
            try {
                this.match("LBRACE", rpcNode);
                while (true) {
                    backup_position = this.position;
                    backup_ringbuffer = this.ringbuffer.slice();
                    backup_tokens = this.tokens.slice();
                    backup_lookahead = this.lookahead;
                    this.option(rpcNode);
                    this.empty(rpcNode);
                    backup_rpcNode = rpcNode.copy();
                }
            } catch (e) {
                if (e.name != "NoTokenMatchError") {
                    throw e;

                }
                this.position = backup_position;
                this.ringbuffer = backup_ringbuffer.slice();
                this.tokens = backup_tokens.slice();
                this.lookahead = backup_lookahead;
                this.match("RBRACE", rpcNode);
            } finally {
                node.addChild(backup_rpcNode);
            }
        }









    }

    messageType(node: ASTNode) {
        var messageTypeNode: ASTNode = new ASTNode("messageType", "");

        var nextToken = this.getLookaheadToken(1);

        if (nextToken.name === "DOT") {
            this.match("DOT", messageTypeNode);
        }

        while (true) {
            if (nextToken.name === "Identifier" && nextToken.name === "DOT") {
                this.match("Identifier", messageTypeNode);
                this.match("DOT", messageTypeNode);
            } else {
                break;
            }
        }

        this.match("Identifier", messageTypeNode);

        node.addChild(messageTypeNode);

    }

    fieldName(node: ASTNode) {
        var fieldNameNode: ASTNode = new ASTNode("fieldName", "");
        this.match("Identifier", fieldNameNode);
        node.addChild(fieldNameNode);


    }

    fieldNumber(node: ASTNode) {
        var fieldNumberNode: ASTNode = new ASTNode("fieldNumber", "");
        this.match("IntegerLiteral", fieldNumberNode);
        node.addChild(fieldNumberNode);
    }

    enumName(node: ASTNode) {
        var enumNameNode: ASTNode = new ASTNode("enumName", "");
        this.match("Identifier", enumNameNode);
        node.addChild(enumNameNode);


    }

    messageName(node: ASTNode) {
        var messageNameNode: ASTNode = new ASTNode("messageName", "");
        this.match("Identifier", messageNameNode);
        node.addChild(messageNameNode);


    }

    enumFieldTag(node: ASTNode) {
        var enumFieldTagNode: ASTNode = new ASTNode("enumFieldTag", "");
        this.match("IntegerLiteral", enumFieldTagNode);
        node.addChild(enumFieldTagNode);
    }

    enumFieldName(node: ASTNode) {
        var enumFieldNameNode: ASTNode = new ASTNode("enumFieldName", "");
        this.match("Identifier", enumFieldNameNode);
        node.addChild(enumFieldNameNode);
    }






}





