# Page

A Page is a javascript abstraction of a webpage meant to help you build
isomorphic web apps. You can think of it as the model layer. It was
built with ReactJS in mind as the view/rendering layer but is generic
enough for use with any templating/view system (e.g. Handlebars).

The abstraction helps you with:

- "isomorphism"
- progressive enhancement
- AJAX on the client
- API interaction

with the following client/server interaction flow in mind (forward in
time is down):

```
................                ..................              .......
|    Browser   |                |  Page server   |              | API |
|              |  Request page  |                |              |     |
|              |--------------->|                |              |     |
|              |                |                |   GET data   |     |
|              |                |                |<------------>|     |
|              |                | 1. Render HTML |              |     |
|              |                | 2. Stash data  |              |     |
|              |    Send HTML   |                |              |     |
|              |<---------------|                |              |     |
| 1. See HTML! |                |                |              |     |
|              |    GET js      |                |              |     |
|              |<-------------->|                |              |     |
| 1. Get stash |                |                |              |     |
| 2. Enhance   |                |                |              |     |
|    HTML w js |                |                |              |     |
| 3. Navigate  |                |                |              |     |
|              |    GET js?     |                |              |     |
|              |<-------------->|                |              |     |
|              |                |                |              |     |
|              |                |................|              |     |
|              |                                                |     |
|              |                     GET data?                  |     |
|              |<---------------------------------------------->|     |
| 1. Render    |                                                |     |
|    HTML      |                                                |     |
|      .       |                                                |  .  |
|      .       |              (AJAX from here down)             |  .  |
|      .       |                                                |  .  |
v              v                                                v     v
```

The design of Page closely ties data with URIs. That is, requests for
more/different data should be accompanied by navigation/URI-changes and vice
versa. This is a necessary design choice if your app promises to serve static
pages; otherwise, you will be serving the same dataset under two
different URIs (maybe not so bad) or different datasets under the same URI (bad
for linking).

URL hash fragments should be used for different views of the same page, since
the hash fragment is not sent to the server when requesting a page. This means
Page supports AJAX through the
[HTML5 history API](https://developer.mozilla.org/en-US/docs/Web/API/History).

## Installation

```
npm install osh-page
```

## Example

Here is a minimal yet complete example.  There is no dynamic js on the client
yet; this is a simple static page server.  Run this in Node.js (script is at
`example/simple.js`).

```js
IMPORT example/simple.js
```

A small mess of html should print to the console that looks something like:

```html
<!DOCTYPE html>
<html>

    <head>
        <title>My page</title>
    </head>

    <body>
        <div id="__mount">
            <h1>Welcome!</h1>
        </div><span id="__stash" data-stash="{&quot;data&quot;:{},&quot;params&quot;:{},&quot;query&quot;:{},&quot;id&quot;:&quot;/home&quot;,&quot;uri&quot;:&quot;/home&quot;}"></span>
    </body>

</html>
```


## Documentation

### Configuration

Create a new Page instance by calling `Page(...)` with a config object holding
the following properties.

#### title (String|Function)

The title can be a simple string or a function that accepts a
[`props`](#the-props-object) object as its single argument.

#### path (Object|Path)

A [Path](https://github.com/openscihub/node-osh-path) instance or config
object. The page will be served at this url after a call to
[`Path.serve()`](#pathserve).

#### body (Function)

The body function takes the [`props`](#the-props-object) object and
returns a string. This string is injected into the `<div id="__mount">`
tag as shown [above](#example).

#### ui (Function)

This function is called after a Page has been rendered to the DOM. On an
initial page load, the

#### data (Object)

The data object is more complex and is at the heart of Page's
functionality. This object is a set of *namespaces* of the developer's
choosing, each equipped with the following properties.

```js
var page = Page({
  // ...
  data: {
    user: {
      stash: function(user) {
        // Return only a subset of user if you don't want to stash everything.
        return user;
      },
      find: function(user) {
        var username = document.getElementById('username').textContent;
        return extend(user, {username: username});
      },
      get: function(props, callback) {
        superagent.get('https://api.github.com/...')
        .end(function(err, res) {
          callback(err, res.body);
        });
      }
    },
    post: { /* e.g. a blog post */ }
  },
  // ...
});
```

##### data.{namespace}.get (Function)

Signature

```
get(Object props, Function callback)
```

Make a request for some data (asynchronously) and pass the data
to a callback when finished. The returned data will be assigned to
`props.data.{namespace}` (see [the `props` object](#the-props-object)).

Note, the props object passed as first argument to this function does *not*
include the data property.

##### data.{namespace}.path (Path)

This must be a [Path](https://github.com/openscihub/node-osh-path)
instance, and will be queried (via GET request) automatically by
Page when it is gathering its data prior to rendering. It is a convenience
for [data.{namespace}.get](#datanamespaceget-function).

Note that the path and query parameters given to a data path GET request
are those given to the various methods that request a Page
(e.g. [visit()](#pagevisit)).
If a translation is required between page parameters and data path parameters,
you must use
[data.{namespace}.get](#datanamespaceget-function) instead.

##### data.{namespace}.stash (Function|Boolean)

Signature

```
stash(* namespace)
```

This function is called on the server and determines what data is stashed in
the `<span id="__stash">` element. If not a function, its truthiness determines
whether to stash all or none of this namespace's data (default is `undefined`
which is falsey).

On initial page load in the browser, Page automatically
loads data from `<span id="__stash">`, passing it to [ui()](#ui) for progressive
enhancement (and/or [body()](#body) on subsequent navigation).
If the data namespace does not exist in the stash, it is loaded via an
API request.

The purpose of the stash option is to prevent duplicate requests to APIs
on initial page load if raw data is needed by your page's javascript; the
API requests are made once on the server, and the resulting data is stashed
in the DOM for immediate use on the client.

The design of the callback allows selective stashing for when
only some of the data under a namespace is large. Simply return from the
stash function the data you would like saved to `<span id="__stash">`.
Use the [find](#datanamespacefind-function) callback to recover
the unstashed data from the DOM.

##### data.{namespace}.find (Function)

Signature

```
find(* namespace)
```

Recover unstashed data for this namespace from the DOM in the browser.  This
function is given the namespace data recovered from `<span id="__stash">` and
should return the fully recovered namespace data (this often means calling
something like [extend()](https://github.com/Raynos/xtend) on the data
recovered from `<span id="__stash">` and returning the result).


### The `props` object

After a Page has finished gathering data, it will pass a `props` object to
various rendering callbacks defined on the Page [config object](#config). The
`props` object will have the following properties:

#### id (String)

An id describing which Page instance this props belongs to.

#### uri (String)

The Page uri built from the given path and query parameters. parameters.

#### data (Object)

The object of [data](#data-object) namespaces.

#### params (Object)

Page path params.

#### query (Object)

Page query params.

## License

MIT
