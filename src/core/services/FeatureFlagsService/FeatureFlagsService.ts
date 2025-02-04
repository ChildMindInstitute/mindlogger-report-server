import * as LaunchDarkly from 'launchdarkly-node-client-sdk'

import { logger } from '../LoggerService'
import { FeatureFlagType } from './FeatureFlagsService.types'
import { DEFAULT_CONTEXT, FeatureFlagDefaults } from './FeatureFlagsService.const'

export class FeatureFlagsService {
  private client?: LaunchDarkly.LDClient
  private flags?: LaunchDarkly.LDFlagSet

  init(): LaunchDarkly.LDClient | undefined {
    if (!this.client) {
      logger.info('[FeatureFlagsService]: Create and init LaunchDarkly client')

      try {
        this.client = LaunchDarkly.initialize(this.getLaunchDarklyKey(), DEFAULT_CONTEXT)
        this.setDefaultFlags()
      } catch (e) {
        logger.error('[FeatureFlagsService]: Failed to initialize LaunchDarkly client', e)
      }
    }

    return this.client
  }

  private async setDefaultFlags() {
    if (!this.client) {
      return
    }

    this.flags = await this.client.identify(DEFAULT_CONTEXT)

    return this.flags
  }

  async login(workspaceId: string) {
    if (!this.client) {
      return
    }

    logger.info('[FeatureFlagsService]: Log user in')

    const context: LaunchDarkly.LDContext = {
      kind: 'report-server-users',
      key: `report-server-users-${workspaceId}`,
      workspaceId,
    }

    return (this.flags = await this.client.identify(context))
  }

  async logout() {
    if (!this.client) {
      return
    }

    logger.info('[FeatureFlagsService]: Log user out')

    return this.setDefaultFlags()
  }

  getFlag<TFlag extends keyof FeatureFlagType>(flag: TFlag): FeatureFlagType[TFlag] {
    if (!this.flags) {
      return FeatureFlagDefaults[flag]
    }

    const flagValue = this.flags[flag] as FeatureFlagType[TFlag] | null | undefined
    return flagValue === null || flagValue === undefined ? FeatureFlagDefaults[flag] : flagValue
  }

  private getLaunchDarklyKey() {
    if (!process.env.LAUNCHDARKLY_CLIENT_ID) {
      throw new Error('[FeatureFlagsService]: LAUNCHDARKLY_CLIENT_ID is not set')
    }

    return process.env.LAUNCHDARKLY_CLIENT_ID ?? ''
  }
}

export const featureFlagsService = new FeatureFlagsService()
