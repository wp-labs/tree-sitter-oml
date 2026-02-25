/// <reference types="tree-sitter-cli/dsl" />

module.exports = grammar({
  name: "oml",

  extras: ($) => [/\s/, $.comment],

  word: ($) => $.identifier,

  rules: {
    source_file: ($) =>
      seq(
        $.header,
        $.separator,
        repeat($.static_block),
        repeat($.aggregate_item),
        optional(seq($.separator, repeat($.privacy_item))),
      ),

    // ── Comments ──────────────────────────────────────────────────
    comment: (_$) =>
      token(choice(seq("#", /.*/), seq("//", /.*/))),

    // ── Separator ────────────────────────────────────────────────
    separator: (_$) => "---",

    // ── Header ───────────────────────────────────────────────────
    header: ($) => seq($.name_field, repeat(choice($.rule_field, $.enable_field))),

    name_field: ($) =>
      seq("name", ":", field("name", choice($.path, $.identifier))),

    enable_field: ($) => seq("enable", ":", $.boolean),

    rule_field: ($) =>
      seq(
        "rule",
        ":",
        choice($.path, $.identifier),
        repeat(choice($.path, $.identifier)),
      ),

    path: (_$) =>
      token(prec(-1, /[a-zA-Z_\/][a-zA-Z0-9_.\/\-*]+/)),

    // ── Static Blocks ──────────────────────────────────────────────
    static_block: ($) =>
      seq("static", "{", repeat1($.static_item), "}"),

    static_item: ($) =>
      seq($.target, "=", $._eval, ";"),

    // ── Aggregate Items ──────────────────────────────────────────
    aggregate_item: ($) =>
      seq($.target_list, "=", $._eval, ";"),

    target_list: ($) =>
      seq($.target, repeat(seq(",", $.target))),

    target: ($) =>
      seq(
        field("name", $.target_name),
        optional(seq(":", field("type", $.data_type))),
      ),

    target_name: ($) => choice("_", $.wild_key, $.identifier),

    wild_key: (_$) =>
      token(prec(1, /\*[a-zA-Z0-9_]*|[a-zA-Z_][a-zA-Z0-9_]*\*/)),

    // ── Eval expressions ─────────────────────────────────────────
    _eval: ($) =>
      choice(
        $.pipe_expr,
        $.fmt_expr,
        $.object_expr,
        $.collect_expr,
        $.match_expr,
        $.sql_expr,
        $.take_expr,
        $.read_expr,
        $.value_expr,
        $.fun_call,
        $.identifier,
      ),

    // ── Read / Take ──────────────────────────────────────────────
    take_expr: ($) =>
      seq("take", "(", optional($.arg_list), ")", optional($.default_body)),

    read_expr: ($) =>
      seq("read", "(", optional($.arg_list), ")", optional($.default_body)),

    // ── Arguments ────────────────────────────────────────────────
    arg_list: ($) =>
      seq($._arg, repeat(seq(",", $._arg))),

    _arg: ($) =>
      choice(
        $.option_arg,
        $.keys_arg,
        $.get_arg,
        $.json_path,
        $.path,
        $.identifier,
      ),

    option_arg: ($) =>
      seq(
        "option",
        ":",
        "[",
        $.identifier,
        repeat(seq(",", $.identifier)),
        "]",
      ),

    keys_arg: ($) =>
      seq(
        choice("in", "keys"),
        ":",
        "[",
        choice($.wild_key, $.identifier),
        repeat(seq(",", choice($.wild_key, $.identifier))),
        "]",
      ),

    get_arg: ($) =>
      seq("get", ":", choice($.identifier, $.number, $.string)),

    json_path: (_$) =>
      token(prec(-1, /\/[a-zA-Z0-9_\[\].*][a-zA-Z0-9_\[\].\/*]*/)),

    // ── Default body ─────────────────────────────────────────────
    default_body: ($) =>
      seq(
        "{",
        "_",
        ":",
        choice($.take_expr, $.read_expr, $.value_expr, $.fun_call, $.identifier),
        optional(";"),
        "}",
      ),

    // ── Value expression ─────────────────────────────────────────
    value_expr: ($) =>
      seq($.data_type, "(", $._literal, ")"),

    // ── Data types ───────────────────────────────────────────────
    data_type: (_$) =>
      choice(
        "auto", "ip", "chars", "digit", "float",
        "time", "bool", "obj", "array",
        "time_iso", "time_3339", "time_2822", "time_timestamp", "time_clf",
        "url", "domain", "ip_net", "kv", "json", "base64",
        token(prec(2, /array\/[a-zA-Z_]+/)),
        token(prec(2, /time\/[a-zA-Z0-9]+/)),
      ),

    // ── Built-in function calls ──────────────────────────────────
    fun_call: (_$) =>
      seq(
        choice("Now::time", "Now::date", "Now::hour"),
        "(",
        ")",
      ),

    // ── Format expression ────────────────────────────────────────
    fmt_expr: ($) =>
      seq(
        "fmt",
        "(",
        $.string,
        ",",
        $.var_get,
        repeat(seq(",", $.var_get)),
        ")",
      ),

    // ── Variable get ─────────────────────────────────────────────
    var_get: ($) =>
      choice(
        seq(choice("read", "take"), "(", optional($.arg_list), ")"),
        $.at_ref,
      ),

    at_ref: ($) => seq("@", $.identifier),

    // ── Pipe expression ──────────────────────────────────────────
    pipe_expr: ($) =>
      seq(
        optional("pipe"),
        $.var_get,
        "|",
        $.pipe_fun,
        repeat(seq("|", $.pipe_fun)),
      ),

    pipe_fun: ($) =>
      choice(
        seq("nth", "(", $.number, ")"),
        seq("get", "(", $.identifier, repeat(seq("/", $.identifier)), ")"),
        seq("base64_decode", "(", optional($.identifier), ")"),
        seq("path", "(", choice("name", "path"), ")"),
        seq(
          "url",
          "(",
          choice("domain", "host", "uri", "path", "params"),
          ")",
        ),
        seq(
          "Time::to_ts_zone",
          "(",
          optional("-"),
          $.number,
          ",",
          choice("ms", "us", "ss", "s"),
          ")",
        ),
        seq("starts_with", "(", $.string, ")"),
        seq("map_to", "(", choice($.string, $.number, $.boolean), ")"),
        "base64_encode",
        "html_escape",
        "html_unescape",
        "str_escape",
        "json_escape",
        "json_unescape",
        "Time::to_ts",
        "Time::to_ts_ms",
        "Time::to_ts_us",
        "to_json",
        "to_str",
        "skip_empty",
        "ip4_to_int",
        "extract_main_word",
        "extract_subject_object",
      ),

    // ── Object expression ────────────────────────────────────────
    object_expr: ($) =>
      seq("object", "{", repeat1($.map_item), "}"),

    map_item: ($) =>
      seq(
        $.map_targets,
        "=",
        choice($.take_expr, $.read_expr, $.value_expr, $.fun_call, $.identifier),
        optional(";"),
      ),

    map_targets: ($) =>
      seq(
        $.identifier,
        repeat(seq(",", $.identifier)),
        optional(seq(":", $.data_type)),
      ),

    // ── Collect expression ───────────────────────────────────────
    collect_expr: ($) => seq("collect", $.var_get),

    // ── Match expression ─────────────────────────────────────────
    match_expr: ($) =>
      choice(
        // Single source
        seq(
          "match",
          $.var_get,
          "{",
          repeat1($.case_arm),
          optional($.default_arm),
          "}",
        ),
        // Multi source
        seq(
          "match",
          "(",
          $.var_get,
          repeat1(seq(",", $.var_get)),
          ")",
          "{",
          repeat1($.multi_case_arm),
          optional($.default_arm),
          "}",
        ),
      ),

    case_arm: ($) =>
      seq($.condition, "=>", $._calc, optional(","), optional(";")),

    multi_case_arm: ($) =>
      seq(
        "(",
        $.condition,
        repeat1(seq(",", $.condition)),
        ")",
        "=>",
        $._calc,
        optional(","),
        optional(";"),
      ),

    default_arm: ($) =>
      seq("_", "=>", $._calc, optional(","), optional(";")),

    _calc: ($) =>
      choice($.read_expr, $.take_expr, $.value_expr, $.collect_expr, $.identifier),

    condition: ($) =>
      seq($._cond_atom, repeat(seq("|", $._cond_atom))),

    _cond_atom: ($) =>
      choice($.in_condition, $.not_condition, $.match_fun, $.value_expr),

    in_condition: ($) =>
      seq("in", "(", $.value_expr, ",", $.value_expr, ")"),

    not_condition: ($) => seq("!", $.value_expr),

    match_fun: ($) =>
      choice(
        seq("starts_with", "(", $.string, ")"),
        seq("ends_with", "(", $.string, ")"),
        seq("contains", "(", $.string, ")"),
        seq("regex_match", "(", $.string, ")"),
        seq("iequals", "(", $.string, ")"),
        seq("is_empty", "(", ")"),
        seq("gt", "(", $.number, ")"),
        seq("lt", "(", $.number, ")"),
        seq("eq", "(", $.number, ")"),
        seq("in_range", "(", $.number, ",", $.number, ")"),
      ),

    // ── SQL expression ───────────────────────────────────────────
    sql_expr: ($) =>
      seq(
        "select",
        $.sql_columns,
        "from",
        $.identifier,
        "where",
        $.sql_condition,
      ),

    sql_columns: ($) =>
      choice("*", seq($.identifier, repeat(seq(",", $.identifier)))),

    sql_condition: ($) =>
      prec.left(seq($._sql_term, repeat(seq(choice("and", "or"), $._sql_term)))),

    _sql_term: ($) =>
      choice(
        $.sql_comparison,
        $.sql_not,
        seq("(", $.sql_condition, ")"),
      ),

    sql_comparison: ($) =>
      seq($.identifier, $.sql_op, $._sql_rhs),

    sql_op: (_$) => choice("=", "!=", "<", ">", "<=", ">="),

    _sql_rhs: ($) =>
      choice(
        $.sql_fun_call,
        $.read_expr,
        $.take_expr,
        $.fun_call,
        $.string,
        $.number,
      ),

    sql_fun_call: ($) =>
      seq(
        $.identifier,
        "(",
        choice(
          $.read_expr,
          $.take_expr,
          $.fun_call,
          $.string,
          $.number,
          $.identifier,
        ),
        ")",
      ),

    sql_not: ($) => seq("not", $.sql_condition),

    // ── Privacy items ────────────────────────────────────────────
    privacy_item: ($) =>
      seq(
        field("name", $.identifier),
        ":",
        field("type", $.privacy_type),
      ),

    privacy_type: (_$) =>
      choice(
        "privacy_ip",
        "privacy_specify_ip",
        "privacy_id_card",
        "privacy_mobile",
        "privacy_mail",
        "privacy_domain",
        "privacy_specify_name",
        "privacy_specify_domain",
        "privacy_specify_address",
        "privacy_specify_company",
        "privacy_keymsg",
      ),

    // ── Literals ─────────────────────────────────────────────────
    _literal: ($) =>
      choice(
        $.string,
        $.number,
        $.ip_literal,
        $.boolean,
        $.identifier,
        $.path,
      ),

    string: (_$) =>
      token(
        choice(
          seq('"', repeat(choice(/[^"\\]/, /\\./)), '"'),
          seq("'", repeat(choice(/[^'\\]/, /\\./)), "'"),
        ),
      ),

    number: (_$) => token(/[0-9]+(\.[0-9]+)?/),

    ip_literal: (_$) => token(/[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/),

    boolean: (_$) => choice("true", "false"),

    // ── Identifier ───────────────────────────────────────────────
    identifier: (_$) => /[a-zA-Z_][a-zA-Z0-9_]*/,
  },
});
