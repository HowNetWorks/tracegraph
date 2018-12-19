module.exports = {
  plugins: ["prettier"],
  env: {
    browser: true,
    es6: true
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module"
  },
  rules: {
    "prettier/prettier": "warn",
    eqeqeq: "error"
  }
};
