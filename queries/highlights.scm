; OML Syntax Highlighting Queries (default tree-sitter)

; ── Keywords ──
[
  "name"
  "rule"
  "pipe"
  "object"
  "collect"
  "match"
  "fmt"
  "select"
  "from"
  "where"
  "and"
  "or"
  "not"
  "in"
  "read"
  "take"
] @keyword

; ── Data types ──
(data_type) @type.builtin

; ── Privacy types ──
(privacy_type) @type.builtin

; ── Built-in functions ──
(fun_call function: _ @function.builtin)

; ── Pipe functions ──
(pipe_fun) @function.builtin

; ── Separator ──
(separator) @punctuation.special

; ── At ref ──
(at_ref) @variable.special

; ── Punctuation ──
[ "(" ")" "{" "}" "[" "]" ] @punctuation.bracket
[ "," ";" ":" "=" ] @punctuation.delimiter
"|" @operator
"=>" @keyword.operator
"!" @operator

; ── Literals ──
(string) @string
(number) @number
(ip_literal) @number
(boolean) @constant.builtin
(comment) @comment

; ── Identifiers ──
(identifier) @variable

; ── Target names ──
(target name: _ @property)

; ── Header name ──
(name_field name: _ @type.definition)

; ── Privacy item name ──
(privacy_item name: (identifier) @property)
