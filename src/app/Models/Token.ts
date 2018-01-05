import { componentFactoryName } from "@angular/compiler";


export class Token {
  constructor(
    public name: string,
    public value: string,
  ) {}

  line = 1;
  index = 1;
}