const fs = require('fs');
const ohm = require('./ohm.js');

const g = ohm.grammar(fs.readFileSync('rbnf.ohm', 'utf-8'));
const rules = fs.readFileSync('rules.rbnf', 'utf-8');

const match = g.match(rules);

if (match.failed()) {
  console.error(match.message);
} else {
  console.log('parsed successfully');
}


class Rule {
  constructor(name, value) {
    this.kind = 'rule';
    this.name = name;
    this.value = value;
  }
}

class Branch {
  constructor(weight, value) {
    this.kind = 'branch';
    this.weight = weight;
    this.value = value;
  }
}

class Sym {
  constructor(name) {
    this.kind = 'symbol';
    this.name = name;
  }
}

class RuleName {
  constructor(name) {
    this.kind = 'rule-name';
    this.name = name;
  }
}

class Unop {
  constructor(name, a) {
    this.kind = 'unop';
    this.name = name;
    this.a = a;
  }
}

class Binop {
  constructor(name, a, b) {
    this.kind = 'binop';
    this.name = name;
    this.a = a;
    this.b = b;
  }
}

class Triop {
  constructor(name, a, b, c) {
    this.kind = 'triop';
    this.name = name;
    this.a = a;
    this.b = b;
    this.c = c;
  }
}

const sem = g.createSemantics();

sem.addOperation('ast', {
  Entry(rules) {
    return rules.children.map(c => c.ast());
  },
  Rule(name, branches, _) {
    return new Rule(name.sourceString, branches.children.map(c => c.ast()));
  },
  Branch(weight, expr) {
    return new Branch(weight.sourceString.length, expr.ast());
  },
  RuleName(name) {
    return new RuleName(name.sourceString);
  },
  Symbol(name) {
    return new Sym(name.sourceString);
  },
  Unop(name, _0, a, _1) {
    return new Unop(name.sourceString, a.ast());
  },
  Binop(name, _0, a, _1, b, _2) {
    return new Binop(name.sourceString, a.ast(), b.ast());
  },
  Triop(name, _0, a, _1, b, _2, c, _3) {
    return new Triop(name.sourceString, a.ast(), b.ast(), c.ast());
  }
});

const tree = sem(match).ast();
console.log(tree);
