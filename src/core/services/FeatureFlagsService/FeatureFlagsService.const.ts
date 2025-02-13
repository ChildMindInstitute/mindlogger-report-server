import * as LaunchDarkly from 'launchdarkly-node-client-sdk'
import { FeatureFlagType } from './FeatureFlagsService.types'

export const FeatureFlagDefaults: FeatureFlagType = {
  'enable-subscale-null-when-skipped': true,
}

export const DEFAULT_CONTEXT: LaunchDarkly.LDContext = {
  kind: 'report-server-users',
  anonymous: true,
} as const
