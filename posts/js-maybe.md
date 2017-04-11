# Maybe

```javascript
const get = (property) => (object) => {
  let result = null;
  if (isObject(object)) {
    result = object[property];
  }
  if (isUndefined(result)) {
    result = null;
  }
  return result;
}
```

```javascript
const getAsArray = (property) => (object) => {
  const result = get(property)(object);
  return result === null ? [] : [result];
}
```

```javascript
const chain = (funcs) => {
  const unit = a => [a];
  return funcs.reduce(
    (f, g) => x => [].concat(...f(x).map(g))
  , unit)
}
```

```javascript
const getIn = (properties) => (object) =>
  chain(properties.map(getAsArray))(object);
```

```javascript
const getInWithDefault = (defaultValue) => (properties) => (object) => 
  getIn(properties)(object).concat([defaultValue]).slice(0,1);
```

```javascript
function unsafe(...args) {
   // could return null 
}
```

```javascript
function liftUnsafe(unsafe) {
  return (...args) => {
    const result = unsafe(...args);
    return result === null ? [] : [result];
  };
}
const withDefault = (defaultVal) => (array) => {
  return array.concat([defaultVal]).slice(0, 1);
}
const map = (fn) => (array) => array.map(x => fn(x));
```

```javascript
const getInWithDefault = (defaultVal) => compose(withDefault(defaultVal), getIn);
```

```javascript
xs => compose(withDefault, chain, map(compose(liftUnsafe, get))(xs))
```

```haskell
maybeAsList :: (a -> Maybe b) -> a -> [a]
maybeAsList f x = maybe [] \x -> [x] (f x) 

withDefault :: a -> [a] -> a
withDefault x' xs = head (xs ++ [x'])

chain :: Monad m => [a -> m b] -> a -> m b
chain fs = foldr (>=>) unit (reverse fs)

chainMaybe :: (a -> b -> Maybe r) -> [a] -> b -> [r]
chainMaybe g = chain . map (maybeAsList . g)
```

```haskell
get :: String -> JSON -> Maybe String
get = undefined

getIn :: [String] -> JSON -> String
getIn = withDefault "Not Found" . (chainMaybe get)
```



```haskell
getIn g = foldl 
```

