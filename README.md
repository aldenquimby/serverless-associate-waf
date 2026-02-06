# serverless-associate-waf

[![NPM Downloads](https://img.shields.io/npm/dt/@aldenquimby/serverless-associate-waf)](https://www.npmjs.com/package/@aldenquimby/serverless-associate-waf)

Associate a regional WAF with the AWS API Gateway used by your Serverless stack.

## Install

`npm install @aldenquimby/serverless-associate-waf --save-dev`

## Configuration

Add the plugin to your `serverless.yml`:

```yaml
plugins:
  - @aldenquimby/serverless-associate-waf
```

### Associating a Regional WAF with the API Gateway

Add your custom configuration:

```yaml
custom:
  associateWaf:
    name: myRegionalWaf
    version: Regional #(optional) Regional | V2
```

| Property | Required | Type     | Default | Description                                                    |
|----------|----------|----------|---------|----------------------------------------------------------------|
| `name`   |  `true`  | `string` |         | The name of the regional WAF to associate the API Gateway with |
| `version`|  `false` | `string` | `Regional`| The AWS WAF version to be used|

### Disassociating a Regional WAF from the API Gateway

Remove the `name` property from your custom configuration but keep the `version` if specified, and then deploy the application. The plugin must stay in the plugins list of `serverless.yml` in order for the WAF to be disassociated.

## Usage

Configuration of your `serverless.yml` is all you need.

There are no custom commands, just run: `sls deploy`
