var _ = require('lodash');

// Continuation Monad(Plus)
// supports unit|return flatMap|bind map alt|mappend
function Cont (f, async) {
  this._func = f;
  this._async = !!async;
  if(async) {
    this.promise = Promise.resolve(true);
  }
}
Cont.prototype = {
  runCont : function(k) {
    return this._async ? this.runContAsync_(k) : this.runContSync_(k);
  },
  runContSync_ : function(k) {
    var f = this._func;
    return f(k);
  },
  runContAsync_ : function(k) {
    var f = this._func;
    var n = 0;
    return new Promise((resolve, reject) => {
      f(function(err, result) {
        if(!err) {
          resolve(k(null, result));
        } else {
          reject(k(err, null)); 
        }
      });
    });
  },
  map : function(f) {
    return this.bind(function(x) {
      return Cont.unit(f(x));
    });
  },
  bind : function(f) {
    return new Cont(k => {
      return this.runCont((err, result) => {
        var newCont;
        if(err) {
          return this._async ? Promise.reject(err) : k(err, null);
        } else {
          newCont = f(result);
          newCont._async = this._async ? true : newCont.async;
          return newCont.runCont(k);
        }
      });
    }, this._async);
  },
  filter : function(predicate) {
    return new Cont(k => {
      this.runCont((err, data) => {
        if (err) {
          k(err, null);
        } else if (predicate(data)) {
          k(null, data);
        }
      });
    });
  }
};
Cont.unit = function unit(a) {
  return new Cont(function(k) {
    return k(null, a);
  });
};
var contErr = new Error('Cont. Error');
Cont.empty = new Cont(function(k) {
  return k(contErr, null);
});
Cont.cpsify = function(cbTaking, async) {
  return function() {
    var args = _.toArray(arguments);
    return new Cont(function(k) {
      args.push(k);
      return cbTaking.apply(null, args);
    }, async);
  };
};

// callCC :: ((a -> Cont r b) -> Cont r a) -> Cont r a
// callCC f = cont $ \h -> runCont (f (\a -> cont $ \_ -> h a)) h
function callCC(f) {
  return new Cont(function(h) {
    return f(a => {
      return new Cont(() => h(null, a))
    }).runCont(h);
  });
}

Cont.callCC = callCC;

module.exports = Cont;
