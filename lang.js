(() => {
  const g = ohm.grammar(`
    RBNF {
      Entry =  Rule*
      RuleName = #(upper | digit)+
      Rule = RuleName Branch+ ";"
      Branch = "|"+ Expr
      Expr = Unop | Binop | Triop | RuleName | Symbol
      OpName = #(lower (lower | digit)*)
      Unop = OpName "(" Expr ")"
      Binop = OpName "(" Expr "," Expr ")"
      Triop = OpName "(" Expr "," Expr "," Expr ")"
      Symbol = "x" | "y" | "t" | "random"
    }
  `);

  const rules = `
    E | vec3(C, C, C);

    A | random
      | x
      | y
      | t
      | abs(x)
      | abs(y)
      | sqrt(add(mult(x, x), mult(y, y)))
      ;

    C ||  A
      ||| add(C, C)
      ||| mult(C, C)
      | sqrt(abs(C))
      || sin(C)
      || exp(C)
      ;
  `;

  const match = g.match(rules);

  if (match.failed()) {
    console.error(match.message);
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

    toString() {
      return this.name;
    }

    toShader() {
      if (this.name === 'random') return (2*rand()-1).toFixed(6);

      return this.name;
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

    toString() {
      return `${this.name}(${this.a.toString()})`;
    }

    toShader() {
      return `${this.name}(${this.a.toShader()})`;
    }
  }

  class Binop {
    constructor(name, a, b) {
      this.kind = 'binop';
      this.name = name;
      this.a = a;
      this.b = b;
    }

    toString() {
      return `${this.name}(${this.a.toString()},${this.b.toString()})`;
    }

    toShader() {
      const a = this.a.toShader();
      const b = this.b.toShader();
      
      switch(this.name) {
        case 'add': return `((${a})+(${b}))`;
        case 'mult': return `((${a})*(${b}))`;
      }
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

    toString() {
      return `${this.name}(${this.a.toString()},${this.b.toString()},${this.c.toString()})`;
    }

    toShader() {
      return `${this.name}(${this.a.toShader()},${this.b.toShader()},${this.c.toShader()})`;
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

  const mulberry32 = (a) => () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };


  const seed = Math.floor(Math.random()*4294967296);
  const rand = mulberry32(seed);
  const parsedRules = sem(match).ast();

  const ruleMaxAttempts = 100;

  const generate = (rules, entryName, depth) => {
    const hash = {};

    for (const r of rules) {
      hash[r.name] = r;
    }

    const genRule = (name, depth) => {
      if (depth <= 0) return null;
      if (!hash[name]) return null;
      if (hash[name].value.length < 1) return null;

      const branches = hash[name].value;
      let weightSum = 0;
      
      for (const br of branches) weightSum += br.weight;

      let node = null;
      for (let attempts = 0; !node && attempts < ruleMaxAttempts; attempts++) {
        const prob = rand();
        let t = 0;

        for (const br of branches) {
          t += br.weight/weightSum;
          
          if (t >= prob) {
            node = genNode(br.value, depth-1);
            break;
          }
        }
      }

      return node;
    };

    const genNode = (node, depth) => {
      switch (node.kind) {
        case 'symbol': {
          return node;
        }
        case 'unop': {
          const a = genNode(node.a, depth);
          if (!a) return null;
          return new Unop(node.name, a);
        }
        case 'binop': {
          const a = genNode(node.a, depth);
          const b = genNode(node.b, depth);
          if (!a || !b) return null;
          return new Binop(node.name, a, b)
        }
        case 'triop': {
          const a = genNode(node.a, depth);
          const b = genNode(node.b, depth);
          const c = genNode(node.c, depth);
          if (!a || !b || !c) return null;
          return new Triop(node.name, a, b, c);
        }
        case 'rule-name': return genRule(node.name, depth-1);

        default: {
          console.error(`Unknown ${node.name}`);
          return null;
        }
      }
    }

    return genRule(entryName, depth);
  }

  console.log(`seed = ${seed}`);

  window.getShaderColor = (depth) => {
    const node = generate(parsedRules, 'E', depth);
    if (!node) {
      console.error('failed to generate shader');
      return null;
    }
    const shader = node.toShader();
    console.log(shader);
    return shader;
  };
})();