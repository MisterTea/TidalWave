if(typeof Meteor == 'undefined') {

  var assert = require("assert");
  var ot = require("./ot");

  describe('OT', function(){
    describe('#compile', function(){
      it('makes a basic check of compile',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
          ]
        };
        assert.equal("Sam, the dog, jumped.",ot.compile(testDocument));
      });
      it('compiles a more complicated example',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"jumped."},
            {name:"ADD", position:0, text:"dog, "},
            {name:"ADD", position:0, text:"the "},
            {name:"ADD", position:0, text:"Sam, "}
          ]
        };
        assert.equal("Sam, the dog, jumped.",ot.compile(testDocument));
      });
      it('compiles a more complicated example with deletes',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"jumped."},
            {name:"ADD", position:0, text:"dog, "},
            {name:"ADD", position:0, text:"the "},
            {name:"ADD", position:0, text:"Sam, "},
            {name:"REMOVE", position:0, count:5},
            {name:"ADD", position:0, text:"Sam, "},
            {name:"REMOVE", position:5, count:9},
            {name:"ADD", position:5, text:"the dog, "},
          ]
        };
        assert.equal("Sam, the dog, jumped.",ot.compile(testDocument));
      });
    });

    describe('#createAddCommand / createRemoveCommand', function(){
      it('is a basic create test.',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
          ]
        };
        testDocument.commands.push(ot.createRemoveCommand(testDocument,1,0,5));
        assert.equal("the dog, jumped.",ot.compile(testDocument));
      });
      it('goes back in time complete overlap',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
            {name:"REMOVE", position:5, count:4},
          ]
        };
        assert.equal(null, ot.createRemoveCommand(testDocument,1,5,4));
      });

      it('goes back in time no overlap',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
            {name:"REMOVE", position:4, count:4},
          ]
        };
        testDocument.commands.push(ot.createRemoveCommand(testDocument,1,0,1));
        assert.equal("am, dog, jumped.",ot.compile(testDocument));
      });
      it('goes back in time no overlap',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
            {name:"REMOVE", position:4, count:4},
          ]
        };
        testDocument.commands.push(ot.createRemoveCommand(testDocument,1,20,1));
        assert.equal("Sam, dog, jumped",ot.compile(testDocument));
      });

      it('goes back in time, total overlap',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
            {name:"REMOVE", position:5, count:4},
          ]
        };
        testDocument.commands.push(ot.createRemoveCommand(testDocument,1,1,8));
        assert.equal("Sdog, jumped.",ot.compile(testDocument));
      });
      it('goes back in time, total overlap',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
            {name:"REMOVE", position:5, count:1},
          ]
        };
        testDocument.commands.push(ot.createRemoveCommand(testDocument,1,1,8));
        assert.equal("Sdog, jumped.",ot.compile(testDocument));
      });
      it('goes back in time, total overlap',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
            {name:"REMOVE", position:5, count:4},
          ]
        };
        testDocument.commands.push(ot.createRemoveCommand(testDocument,1,5,9));
        assert.equal("Sam, jumped.",ot.compile(testDocument));
      });
      it('goes back in time, total overlap',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
            {name:"REMOVE", position:5, count:1},
          ]
        };
        testDocument.commands.push(ot.createRemoveCommand(testDocument,1,5,9));
        assert.equal("Sam, jumped.",ot.compile(testDocument));
      });


      it('goes back in time, partial overlap',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
            {name:"REMOVE", position:5, count:2},
          ]
        };
        testDocument.commands.push(ot.createRemoveCommand(testDocument,1,6,3));
        assert.equal("Sam, dog, jumped.",ot.compile(testDocument));
      });
      it('goes back in time, partial overlap',function() {
        var testDocument = {
          base:"",
          commands:[
            {name:"ADD", position:0, text:"Sam, the dog, jumped."},
            {name:"REMOVE", position:6, count:3},
          ]
        };
        testDocument.commands.push(ot.createRemoveCommand(testDocument,1,5,2));
        assert.equal("Sam, dog, jumped.",ot.compile(testDocument));
      });

    });

  });

}
