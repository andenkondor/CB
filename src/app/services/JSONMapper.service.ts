import { Token } from '../models/token';
import { ASTNode } from "../models/ASTNode";
import { ScopeNode } from "../models/ScopeNode";

export class JSONMapperService {

    tree: ASTNode;
    errors = [];
    JSONtext = "{";
    level = 0;


    initialize(tree) {
        this.tree = tree;
        this.errors = [];
        this.JSONtext = "{";
        this.level = 0;

    }



    map() {
        this.level++;
        this.recursiveDescent(this.tree);



        
        this.JSONtext += "\n}";
        return this.JSONtext;
    }


    recursiveDescent(node:ASTNode){

        for(var child in node.children){
            if(node.children[child].rule === "message"){
                this.mapMessage(node.children[child]);
            }else if(node.children[child].rule === "enumDefinition"){
                this.mapEnum(node.children[child]);
            }else if(node.children[child].rule === "field"){
                this.mapField(node.children[child]); 
            }else if(node.children[child].rule === "mapField"){
                this.mapMap(node.children[child]); 
            }else{
                this.recursiveDescent(node.children[child]);
            }
        }
    }



    mapMessage(node:ASTNode){
        if(this.JSONtext[this.JSONtext.length-1] === " "){
            this.JSONtext = this.JSONtext.substring(0, this.JSONtext.length-1) + "," + this.JSONtext.substring(this.JSONtext.length);                
        }
        this.setTabs(this.level);
        this.JSONtext += '"'+node.children[1].children[0].value+'":';
        this.setTabs(this.level);
        this.JSONtext += "{";        
        this.level++;
        this.recursiveDescent(node.children[2]);        
        this.level--;
        this.setTabs(this.level);
        this.JSONtext += "} ";
    }

    mapField(node:ASTNode){
        if(this.JSONtext[this.JSONtext.length-1] === " "){
            this.JSONtext = this.JSONtext.substring(0, this.JSONtext.length-1) + "," + this.JSONtext.substring(this.JSONtext.length);                
        }

        this.setTabs(this.level);
        if(node.children[0].token === "REPEATED"){
            this.JSONtext += '"'+node.children[2].children[0].value+'": [';
            this.mapType(node.children[1]);
            this.JSONtext += ", ...] ";
        }else{
            this.JSONtext += '"'+node.children[1].children[0].value+'": ';
            this.mapType(node.children[0]);
            this.JSONtext += " ";
        }
    }

    mapType(node:ASTNode){
        if(node.children[0].token === "FLOAT" ||
           node.children[0].token === "DOUBLE"){
               this.JSONtext += "3.1415";
           }else if(node.children[0].token === "INT32" ||
           node.children[0].token === "INT64" ||
           node.children[0].token === "UINT32" ||
           node.children[0].token === "UINT64"||
           node.children[0].token === "SINT32" ||
           node.children[0].token === "SINT64"||
           node.children[0].token === "FIXED32" ||
           node.children[0].token === "FIXED64"||
           node.children[0].token === "SFIXED32" ||
           node.children[0].token === "SFIXED64"||
           node.children[0].token === "BYTES"){
                this.JSONtext += "41";
           }else if(node.children[0].token === "STRING"){
            this.JSONtext += '"hello world"'
           }else if(node.children[0].token === "BOOL"){
            this.JSONtext += "true";
            }else{
                this.JSONtext += "<";
                for(var i in node.children[0].children){
                    if(node.children[0].children[i].token === "DOT"){
                        this.JSONtext += ".";                        
                    }else{
                        this.JSONtext += node.children[0].children[i].value;
                    }
                }
                this.JSONtext += ">";
            }
    }




    mapEnum(node:ASTNode){
        if(this.JSONtext[this.JSONtext.length-1] === " "){
            this.JSONtext = this.JSONtext.substring(0, this.JSONtext.length-1) + "," + this.JSONtext.substring(this.JSONtext.length);                
        }
        this.setTabs(this.level);
        this.JSONtext += '"'+node.children[1].children[0].value+'": ';
        this.enumFields(node.children[2]);        
        }


    enumFields(node:ASTNode){
        this.JSONtext += "[";
        for(var i in node.children){
            if(node.children[i].rule === "enumField"){
                this.JSONtext += '"'+node.children[i].children[0].children[0].value+'", ';
            }
        }
        this.JSONtext = this.JSONtext.substring(0, this.JSONtext.length-2);
        this.JSONtext += "] ";
        
    }

    mapMap(node:ASTNode){

        if(this.JSONtext[this.JSONtext.length-1] === " "){
            this.JSONtext = this.JSONtext.substring(0, this.JSONtext.length-1) + "," + this.JSONtext.substring(this.JSONtext.length);                
        }

        this.setTabs(this.level);
        this.JSONtext += '"'+node.children[6].value+'":';
        this.setTabs(this.level);
        this.JSONtext += "{";
        this.level++;
        this.setTabs(this.level);
        this.JSONtext += '"Keys": [';
        this.mapType(node.children[2]);
        this.JSONtext += ", ...],";
        this.setTabs(this.level);
        this.JSONtext += '"Values": [';
        this.mapType(node.children[4]);
        this.JSONtext += ", ...]";
        this.level--;
        this.setTabs(this.level);
        this.JSONtext += "} ";
        

    }


    setTabs(count){
        this.JSONtext += "\n";
        for(var i = 0; i< count;i++){
            this.JSONtext += "\t";
        
        }
    }



}