jest.mock('@aws-sdk/client-cloudformation')
jest.mock('@aws-sdk/client-waf-regional')
jest.mock('@aws-sdk/client-wafv2')

const AssociateWafPlugin = require('.')
const Serverless = require('serverless/lib/Serverless')
const AwsProvider = jest.createMockFromModule('serverless/lib/plugins/aws/provider')
const { CloudFormationClient } = require('@aws-sdk/client-cloudformation')
const { WAFRegionalClient } = require('@aws-sdk/client-waf-regional')
const { WAFV2Client } = require('@aws-sdk/client-wafv2')

const AWSErrorMessage = 'Some AWS provider error'
const WAF_REGIONAL = "WAFRegional"
const WAF_V2 = "WAFV2"
const ALLOWED_WAF_VERSIONS = [WAF_REGIONAL, WAF_V2]
const ALLOWED_WAF_SCOPE = "REGIONAL"

describe('AssociateWafPlugin', () => {
  let plugin
  let serverless
  let options
  let log
  let cloudFormationSend
  let wafRegionalSend
  let wafV2Send

  beforeEach(() => {
    CloudFormationClient.mockClear()
    WAFRegionalClient.mockClear()
    WAFV2Client.mockClear()

    cloudFormationSend = jest.fn()
    wafRegionalSend = jest.fn()
    wafV2Send = jest.fn()

    CloudFormationClient.mockImplementation(() => ({ send: cloudFormationSend }))
    WAFRegionalClient.mockImplementation(() => ({ send: wafRegionalSend }))
    WAFV2Client.mockImplementation(() => ({ send: wafV2Send }))

    serverless = new Serverless({ commands: [], options: {} })
    serverless.service.service = 'my-service'
    serverless.service.serviceObject = {
      name: 'my-service'
    }
    options = {}
    const provider = new AwsProvider(serverless);
    provider.getRegion = jest.fn().mockReturnValue('us-west-2');
    provider.getAwsSdkV3Config = jest.fn().mockResolvedValue({ region: 'us-west-2' });
    serverless.setProvider('aws', provider);
    log = { info: jest.fn(), warning: jest.fn(), error: jest.fn() }
  })

  describe('constructor', () => {
    beforeEach(() => {
      plugin = new AssociateWafPlugin(serverless, options, { log })
    })

    it('should set the provider to instance of AwsProvider', () => {
      expect(plugin.provider).toBeInstanceOf(AwsProvider)
    })

    it('should have access to the serverless instance', () => {
      expect(plugin.serverless).toEqual(serverless)
    })

    it(`wafVersion should be one of ${ALLOWED_WAF_VERSIONS}`, () => {
      expect(ALLOWED_WAF_VERSIONS).toContain(plugin.wafVersion);
    })

    it(`wafScope should equal ${ALLOWED_WAF_SCOPE}`, () => {
      expect(plugin.wafScope).toEqual(ALLOWED_WAF_SCOPE)
    })
  })

  describe('without configuration', () => {
    describe('with missing object "custom"', () => {
      beforeEach(() => {
        serverless.service.custom = undefined
        plugin = new AssociateWafPlugin(serverless, options, { log })
      })

      it('should default to empty config', () => {
        expect(plugin.config).toEqual({})
      })

      it('should set hooks', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })

    })

    describe('with missing object "custom.associateWaf"', () => {
      beforeEach(() => {
        serverless.service.custom = {}
        plugin = new AssociateWafPlugin(serverless, options, { log })
      })

      it('should default to empty config', () => {
        expect(plugin.config).toEqual({})
      })

      it('should set hooks', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })

    })

    describe('with null object "custom.associateWaf"', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: null
        }
        plugin = new AssociateWafPlugin(serverless, options, { log })
      })

      it('should default to empty config', () => {
        expect(plugin.config).toEqual({})
      })

      it('should set hooks', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })

    })

    describe('with missing property "custom.associateWaf.name"', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: {}
        }
        plugin = new AssociateWafPlugin(serverless, options, { log })
      })

      it('should set hooks if ', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })
    })

    describe('with empty property "custom.associateWaf.name"', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: {
            name: ''
          }
        }
        serverless.service.provider.compiledCloudFormationTemplate = {
          Outputs: [
            {}]
        }
        plugin = new AssociateWafPlugin(serverless, options, { log })
      })

      it('should set hooks if ', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })
    })

    describe('with invalid property "custom.associateWaf.version"', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: {
            version: "invalid-version"
          }
        }
        plugin = new AssociateWafPlugin(serverless, options, { log })
      })

      it('should set hooks if ', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('should log info when invalid version configuration exists ', () => {
        expect(log.warning).toHaveBeenLastCalledWith(expect.stringContaining('Invalid WAF Version Configuration'))
      })

      it(`wafVersion should equal ${WAF_REGIONAL}`, () => {
        expect(WAF_REGIONAL).toEqual(plugin.wafVersion);
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })
    })

    describe('with null property "custom.associateWaf.version"', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: {}
        }
        serverless.service.provider.compiledCloudFormationTemplate = {
          Outputs: [
            {}]
        }
        plugin = new AssociateWafPlugin(serverless, options, { log })
      })

      it('should set hooks if ', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it(`wafVersion should equal ${WAF_REGIONAL}`, () => {
        expect(WAF_REGIONAL).toEqual(plugin.wafVersion);
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('"disassociateWaf()" should be invoked', async () => {
        await expectDisassociateWafToHaveBeenCalled(plugin)
      })
    })
  })

  describe('with configuration', () => {
    describe('default configuration', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: {
            name: 'stage-service-name'
          }
        }
        serverless.service.provider.compiledCloudFormationTemplate = {
          Outputs: [
            'ApiGatewayRestApiWaf', {Description: 'Rest API Id', Value: 'some-api-rest-id'}]
        }
        plugin = new AssociateWafPlugin(serverless, options, { log })
      })

      it('should set config', () => {
        expect(plugin.config).toBeTruthy()
      })

      it('should set hooks', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('should output restApiId', () => {
        plugin.updateCloudFormationTemplate()
        expect(serverless.service.provider.compiledCloudFormationTemplate.Outputs['ApiGatewayRestApiWaf']).toBeDefined()
      })

      it('"associateWaf()" should be invoked', async () => {
        plugin.associateWaf = jest.fn()
        plugin.associateWaf.mockResolvedValueOnce({})
        await plugin.updateWafAssociation()
        expect(plugin.associateWaf).toHaveBeenCalled()
      })
    })

    describe('with adding property "custom.associateWaf.version" === "V2" ', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: {
            name: 'stage-service-name',
            version: "V2"
          }
        }
        serverless.service.provider.compiledCloudFormationTemplate = {
          Outputs: ['ApiGatewayRestApiWaf', { Description: 'Rest API Id', Value: 'some-api-rest-id' }]
        }
        plugin = new AssociateWafPlugin(serverless, options, { log })
      })

      it('should set config', () => {
        expect(plugin.config).toBeTruthy()
      })

      it(`wafVersion should be ${WAF_V2}`, () => {
        expect(plugin.wafVersion).toEqual(WAF_V2);
      })

      it('should set hooks', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('should output restApiId', () => {
        plugin.updateCloudFormationTemplate()
        expect(serverless.service.provider.compiledCloudFormationTemplate.Outputs['ApiGatewayRestApiWaf']).toBeDefined()
      })

      it('"associateWaf()" should be invoked', async () => {
        plugin.associateWaf = jest.fn()
        plugin.associateWaf.mockResolvedValueOnce({})
        await plugin.updateWafAssociation()
        expect(plugin.associateWaf).toHaveBeenCalled()
      })
    })

    describe('with adding property "custom.associateWaf.version" !== "V2" ', () => {
      beforeEach(() => {
        serverless.service.custom = {
          associateWaf: {
            name: 'stage-service-name',
            version: "default-version"
          }
        }
        serverless.service.provider.compiledCloudFormationTemplate = {
          Outputs: ['ApiGatewayRestApiWaf', { Description: 'Rest API Id', Value: 'some-api-rest-id' }]
        }
        plugin = new AssociateWafPlugin(serverless, options, { log })
      })

      it('should set config', () => {
        expect(plugin.config).toBeTruthy()
      })

      it(`wafVersion should be ${WAF_REGIONAL}`, () => {
        expect(plugin.wafVersion).toEqual(WAF_REGIONAL);
      })

      it('should set hooks', () => {
        expect(plugin.hooks).toHaveProperty('after:deploy:deploy')
        expect(plugin.hooks).toHaveProperty('before:package:finalize')
      })

      it('"outputRestApiId()" should be invoked', async () => {
        await expectOutputRestApiIdToHaveBeenCalled(plugin)
      })

      it('should output restApiId', () => {
        plugin.updateCloudFormationTemplate()
        expect(serverless.service.provider.compiledCloudFormationTemplate.Outputs['ApiGatewayRestApiWaf']).toBeDefined()
      })

      it('"associateWaf()" should be invoked', async () => {
        plugin.associateWaf = jest.fn()
        plugin.associateWaf.mockResolvedValueOnce({})
        await plugin.updateWafAssociation()
        expect(plugin.associateWaf).toHaveBeenCalled()
      })
    })

  })

  const mockStackResources = {
    StackResourceSummaries: [
      {
        LogicalResourceId: 'some',
        PhysicalResourceId: 'thing'
      },
      {
        LogicalResourceId: 'ApiGatewayRestApi',
        PhysicalResourceId: 'theRestApiId'
      }
    ]
  }

  const mockStackOutputs = {
    Stacks: [
      {
        Outputs: [
          {
            OutputKey: 'some',
            OutputValue: 'value'
          },
          {
            OutputKey: 'ApiGatewayRestApiWaf',
            OutputValue: 'theRestApiId'
          }
        ]
      }
    ]
  }

  const mockStackMissingOutputs = {
    Stacks: [
      {
        NotOutputs: [{}]
      }
    ]
  }

  describe('associateWaf()', () => {

    describe("associate Waf regional", () => {
    beforeEach(() => {
      serverless.service.custom = {
        associateWaf: {
          name: 'some-waf-name'
        }
      }
      plugin = new AssociateWafPlugin(serverless, options, { log })
    })

    it('should not lookup REST API ID from CloudFormation stack if specified by provider configuration', async () => {
      plugin.serverless.service.provider.apiGateway = {
        restApiId: 'something'
      }
      wafRegionalSend.mockResolvedValueOnce({})

      await plugin.associateWaf()

      expect(cloudFormationSend).not.toHaveBeenCalled()
    })

    it('should log info when unable to find REST API ID from CloudFormation stack', async () => {
      cloudFormationSend.mockResolvedValue({})

      await plugin.associateWaf()

      expect(log.warning).toHaveBeenLastCalledWith(expect.stringContaining('Unable to determine REST API ID'))
    })

    it('should log info when unable to fund REST API ID from stack outputs', async () => {
      cloudFormationSend.mockResolvedValueOnce({})
      cloudFormationSend.mockResolvedValueOnce(mockStackMissingOutputs)

      await plugin.associateWaf()

      expect(log.warning).toHaveBeenLastCalledWith(expect.stringContaining('Unable to determine REST API ID'))
    })

    it('should log info when unable to find WAF', async () => {
      cloudFormationSend
        .mockResolvedValueOnce(mockStackResources)
      wafRegionalSend
        .mockResolvedValueOnce({})

      await plugin.associateWaf()

      expect(log.warning).toHaveBeenLastCalledWith(expect.stringContaining('Unable to find WAF named'))
    })

    it('should log error when exception caught', async () => {
      setupAwsErrorMessage(plugin)
      await plugin.associateWaf()
      expect(log.error).toHaveBeenLastCalledWith(expect.stringContaining(AWSErrorMessage))
    })

    it('should associate WAF', async () => {
      const mockWebAcls = {
        WebACLs: [
          {
            Name: 'skip-waf-name',
            WebACLId: 'skip-waf-id'
          },
          {
            Name: 'some-waf-name',
            WebACLId: 'some-waf-id'
          }
        ]
      }

      cloudFormationSend
        .mockResolvedValueOnce(mockStackResources)
      wafRegionalSend
        .mockResolvedValueOnce(mockWebAcls)

      await plugin.associateWaf()

      expect(log.info).toHaveBeenLastCalledWith(expect.stringContaining('Associating WAF...'))
    })

    it('should associate WAF with split stacks plugin', async () => {
      const mockWebAcls = {
        WebACLs: [
          {
            Name: 'skip-waf-name',
            WebACLId: 'skip-waf-id'
          },
          {
            Name: 'some-waf-name',
            WebACLId: 'some-waf-id'
          }
        ]
      }

      cloudFormationSend
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce(mockStackOutputs)
      wafRegionalSend
        .mockResolvedValueOnce(mockWebAcls)

      await plugin.associateWaf()

      expect(log.info).toHaveBeenLastCalledWith(expect.stringContaining('Associating WAF...'))
    })
    })

    describe("associate Waf V2", () => {
    beforeEach(() => {
      serverless.service.custom = {
        associateWaf: {
          name: 'some-waf-name',
          version: "V2"
        }
      }
      plugin = new AssociateWafPlugin(serverless, options, { log })
    })

    it('should not lookup REST API ID from CloudFormation stack if specified by provider configuration', async () => {
      plugin.serverless.service.provider.apiGateway = {
        restApiId: 'something'
      }
      wafV2Send.mockResolvedValueOnce({})

      await plugin.associateWaf()

      expect(cloudFormationSend).not.toHaveBeenCalled()
    })

    it('should log info when unable to find REST API ID from CloudFormation stack', async () => {
      cloudFormationSend.mockResolvedValue({})

      await plugin.associateWaf()

      expect(log.warning).toHaveBeenLastCalledWith(expect.stringContaining('Unable to determine REST API ID'))
    })

    it('should log info when unable to fund REST API ID from stack outputs', async () => {
      cloudFormationSend.mockResolvedValueOnce({})
      cloudFormationSend.mockResolvedValueOnce(mockStackMissingOutputs)

      await plugin.associateWaf()

      expect(log.warning).toHaveBeenLastCalledWith(expect.stringContaining('Unable to determine REST API ID'))
    })

    it('should log info when unable to find WAF', async () => {
      cloudFormationSend
        .mockResolvedValueOnce(mockStackResources)
      wafV2Send
        .mockResolvedValueOnce({})

      await plugin.associateWaf()

      expect(log.warning).toHaveBeenLastCalledWith(expect.stringContaining('Unable to find WAF named'))
    })

    it('should log error when exception caught', async () => {
      setupAwsErrorMessage(plugin)
      await plugin.associateWaf()
      expect(log.error).toHaveBeenLastCalledWith(expect.stringContaining(AWSErrorMessage))
    })

    it('should associate WAF', async () => {
      const mockWebAcls = {
        WebACLs: [
          {
            Name: 'skip-waf-name',
            ARN: 'skip-waf-arn'
          },
          {
            Name: 'some-waf-name',
            ARN: 'some-waf-arn'
          }
        ]
      }

      cloudFormationSend
        .mockResolvedValueOnce(mockStackResources)
      wafV2Send
        .mockResolvedValueOnce(mockWebAcls)

      await plugin.associateWaf()

      expect(log.info).toHaveBeenLastCalledWith(expect.stringContaining('Associating WAF...'))
    })

    it('should associate WAF with split stacks plugin', async () => {
      const mockWebAcls = {
        WebACLs: [
          {
            Name: 'skip-waf-name',
            ARN: 'skip-waf-arn'
          },
          {
            Name: 'some-waf-name',
            ARN: 'some-waf-arn'
          }
        ]
      }

      cloudFormationSend
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce(mockStackOutputs)
      wafV2Send
        .mockResolvedValueOnce(mockWebAcls)

      await plugin.associateWaf()

      expect(log.info).toHaveBeenLastCalledWith(expect.stringContaining('Associating WAF...'))
    })

  })
  })

  describe('disassociateWaf()', () => {
    beforeEach(() => {
      serverless.service.custom = {}
      plugin = new AssociateWafPlugin(serverless, options, { log })
    })

    it('should log info when unable to find REST API ID from CloudFormation stack', async () => {
      cloudFormationSend.mockResolvedValue({})

      await plugin.disassociateWaf()

      expect(log.warning).toHaveBeenLastCalledWith(expect.stringContaining('Unable to determine REST API ID'))
    })

    it('should log error when exception caught', async () => {
      setupAwsErrorMessage(plugin)
      await plugin.disassociateWaf()
      expect(log.error).toHaveBeenLastCalledWith(expect.stringContaining(AWSErrorMessage))
    })

    it('should disassociate WAF if associated', async () => {
      const mockWebAcls = {
        WebACLSummary: {
          WebACLId: 'some-waf-id',
          Name: 'some-waf-name'
        }
      }

      cloudFormationSend
        .mockResolvedValueOnce(mockStackResources)
      wafRegionalSend
        .mockResolvedValueOnce(mockWebAcls)
        .mockResolvedValueOnce({})

      await plugin.disassociateWaf()

      expect(log.info).toHaveBeenLastCalledWith(expect.stringContaining('Disassociating WAF...'))
    })

    it('should not disassociate WAF if associated', async () => {
      const mockWebAcls = { }

      cloudFormationSend
        .mockResolvedValueOnce(mockStackResources)
        .mockResolvedValueOnce(mockStackOutputs)
      wafRegionalSend
        .mockResolvedValueOnce(mockWebAcls)
        .mockResolvedValueOnce({})

      await plugin.disassociateWaf()

      expect(log.info).not.toHaveBeenLastCalledWith(expect.stringContaining('Disassociating WAF...'))
    })

  })

  function setupAwsErrorMessage(plugin){
    cloudFormationSend
      .mockRejectedValueOnce(new Error(AWSErrorMessage))
  }

  async function expectDisassociateWafToHaveBeenCalled(plugin){
    plugin.disassociateWaf = jest.fn()
    plugin.disassociateWaf.mockResolvedValueOnce({})
    await plugin.updateWafAssociation()
    expect(plugin.disassociateWaf).toHaveBeenCalled()
  }

  async function expectOutputRestApiIdToHaveBeenCalled(plugin){
    plugin.outputRestApiId = jest.fn()
    plugin.outputRestApiId.mockResolvedValueOnce({})
    await plugin.updateCloudFormationTemplate()
    expect(plugin.outputRestApiId).toHaveBeenCalled()
  }

})
