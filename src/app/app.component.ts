import { Component } from '@angular/core';
import { LexerService} from './services/lexer.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})


export class AppComponent {
  title = 'app';
  srcText:string = "";
  targetText = "";
  consoleText = "";

  constructor(public lexerService:LexerService){}



resetInputs(){
  this.srcText = "";
  this.targetText = "";
  this.consoleText = "";
}

convertDisabled(){
  var disabled = false;

  if(this.srcText === ""){
    disabled = true;
  }

  return disabled;
}

convert(){
  this.lexerService.initialize(this.srcText);
  var tokens = this.lexerService.getTokens();
  console.log(tokens);
}


}