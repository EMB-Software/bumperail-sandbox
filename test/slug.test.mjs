import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slug } from '../src/slug.mjs'

test('lowercases and joins words with hyphens', () => assert.equal(slug('Hello World'), 'hello-world'))
test('strips accents', () => assert.equal(slug('Crème Brûlée'), 'creme-brulee'))
test('trims and collapses punctuation', () => assert.equal(slug('  --A  &  B!! '), 'a-b'))
test('empty input gives empty slug', () => assert.equal(slug(''), ''))
