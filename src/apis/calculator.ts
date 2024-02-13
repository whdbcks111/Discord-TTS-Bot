class EmptyNode {
    left: EmptyNode | null = null;
    right: EmptyNode | null = null;
    parent: EmptyNode | null = null;

    constructor() {}

    evaluate(): number {
        return this.left !== null ? this.left.evaluate() : 0;
    }

    addChild(child: EmptyNode) {
        if(this.left === null) {
            this.left = child;
            child.parent = this;
        }
        else if(this.right === null) {
            this.right = child;
            child.parent = this;
        }
        else throw new Error('overflow');
    }

    isCompleted() {
        return this.left !== null;
    }
}

class ParenthesisNode extends EmptyNode {
    closed: boolean = false;

    isCompleted() {
        return this.closed;
    }
}


class NumberNode extends EmptyNode {

    value: number;

    constructor(value: number) {
        super();
        this.value = value;
    }

    evaluate() {
        return this.value;
    }

    isCompleted() {
        return true;
    }
}

class BinaryOperatorNode extends EmptyNode {

    priority: number = 0;

    isCompleted() {
        return (this.left?.isCompleted() ?? false) && 
            (this.right?.isCompleted() ?? false)
    }
}

class AddNode extends BinaryOperatorNode {
    evaluate() {
        return (this.left?.evaluate() ?? 0) + (this.right?.evaluate() ?? 0);
    }
}


class SubNode extends BinaryOperatorNode {
    evaluate() {
        return (this.left?.evaluate() ?? 0) - (this.right?.evaluate() ?? 0);
    }
}

class MultiplyNode extends BinaryOperatorNode {
    constructor() {
        super();
        this.priority = 1;
    }
    evaluate() {
        return (this.left?.evaluate() ?? 0) * (this.right?.evaluate() ?? 0);
    }
}

class DivideNode extends BinaryOperatorNode {
    constructor() {
        super();
        this.priority = 1;
    }
    evaluate() {
        if((this.right?.evaluate() ?? 0) === 0) throw new Error('Division by zero');
        return (this.left?.evaluate() ?? 0) / (this.right?.evaluate() ?? 0);
    }
}

class PowerNode extends BinaryOperatorNode {
    constructor() {
        super();
        this.priority = 2;
    }
    evaluate() {
        return Math.pow(this.left?.evaluate() ?? 0, this.right?.evaluate() ?? 0);
    }
}


/**
 * @param {string} exp
 */
function parseExpression(exp: string) {
    let rootNode = new EmptyNode();
    let curNode: EmptyNode | null = rootNode;
    let pointer = 0;

    function addOper(oper: BinaryOperatorNode) {
        if(curNode === null) return;
        if(curNode.left instanceof BinaryOperatorNode && oper.priority > curNode.left.priority) {
            oper.left = curNode.left.right;
            if(oper.left) oper.left.parent = oper;
            curNode.left.right = oper;
            oper.parent = curNode.left;
        }
        else {
            oper.left = curNode.left;
            if(oper.left) oper.left.parent = oper;
            curNode.left = oper;
            oper.parent = curNode;
        }
        curNode = oper;
    }

    while(pointer < exp.length) {
        let numMatch = exp.slice(pointer).match(/^-?\d+(\.\d+)?/);
        
        if(numMatch !== null) {
            let value = parseFloat(numMatch[0]);
            let child = new NumberNode(value);

            curNode?.addChild(child);
            curNode = child;

            pointer += numMatch[0].length;
        }
        else if(exp.startsWith('+', pointer)) {
            let oper = new AddNode();
            addOper(oper);
            pointer++;
        }
        else if(exp.startsWith('-', pointer)) {
            let oper = new SubNode();
            addOper(oper);
            pointer++;
        }
        else if(exp.startsWith('*', pointer)) {
            let oper = new MultiplyNode();
            addOper(oper);
            pointer++;
        }
        else if(exp.startsWith('/', pointer)) {
            let oper = new DivideNode();
            addOper(oper);
            pointer++;
        }
        else if(exp.startsWith('^', pointer)) {
            let oper = new PowerNode();
            addOper(oper);
            pointer++;
        }
        else if(exp.startsWith('(', pointer)) {
            let child = new ParenthesisNode();
            curNode?.addChild(child);
            curNode = child;

            pointer++;
        }
        else if(exp.startsWith(')', pointer)) {
            if(curNode == null) throw new Error('Too many parenthesis');
            while(!(curNode instanceof ParenthesisNode) && curNode)
                curNode = curNode.parent;
            if(curNode) curNode.closed = true;
            pointer++;
        }
        else throw new Error('Invalid Expression');

        while(curNode?.parent !== null && curNode?.isCompleted()) {
            curNode = curNode.parent;
        } 
    }

    if(curNode !== rootNode) throw new Error('Uncompleted Expression');
    return rootNode;
}

export function calculate(exp: string) {
    return parseExpression(exp).evaluate();
}