import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'hptt7wjq',
    dataset: 'production'
  },
  studioHost: 'pit-wall-f1',
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
    appId: 'q6mzo04krpiktbuyd6byesk4',
  },
})
