import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'

const sharedGlobals = {
  ...globals.browser,
  ...globals.node,
  defineProps: 'readonly',
  defineEmits: 'readonly',
  defineExpose: 'readonly',
  defineOptions: 'readonly',
  withDefaults: 'readonly'
}

const testGlobals = {
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  vi: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  afterAll: 'readonly',
  afterEach: 'readonly'
}

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**'
    ]
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: sharedGlobals
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'vue/no-mutating-props': 'off',
      'vue/no-use-v-if-with-v-for': 'warn',
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    files: ['src/**/*.{js,mjs,vue}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['primevue/*'],
              message:
                'Import PrimeVue only in src/components/ui or src/plugins/primevue.js.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/components/ui/**/*.{js,mjs,vue}', 'src/plugins/primevue.js'],
    rules: {
      'no-restricted-imports': 'off'
    }
  },
  {
    files: ['src/**/*.{spec,test}.{js,mjs,vue}', 'tests/**/*.js'],
    languageOptions: {
      globals: {
        ...sharedGlobals,
        ...testGlobals
      }
    }
  }
]
