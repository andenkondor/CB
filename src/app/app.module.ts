import { BrowserModule } from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import { NgModule } from '@angular/core';
import { LexerService} from './services/lexer.service';


import { AppComponent } from './app.component';
import { ParserService } from './services/parser.service';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    FormsModule
  ],
  providers: [LexerService, ParserService],
  bootstrap: [AppComponent]
})
export class AppModule { }
