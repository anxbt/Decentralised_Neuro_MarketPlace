import * as fc from 'fast-check'
import type { NewDataset } from './dataset.js'
import { insertDataset, getDatasets, getDatasetById, getDatasetsByResearcher, updatePurchaseCount } from './dataset.js'
import db from '../db/sqlite.js'

beforeEach(() => {
  // Clear tables before each test
  db.exec('DELETE FROM purchases')
  db.exec('DELETE FROM datasets')
})

afterAll(() => {
  db.close()
})

describe('Dataset Data Access Layer', () => {
  /**
   * Feature: neuromarket, Property 24: API data persistence
   * Validates: Requirements 10.1, 10.2, 10.3
   * 
   * For any dataset registration request to the backend, the metadata should be 
   * stored in SQLite and retrievable via the GET endpoints.
   */
  test('Property 24: stored datasets are retrievable with complete metadata', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          title: fc.string({ minLength: 1, maxLength: 200 }),
          description: fc.string({ minLength: 1, maxLength: 1000 }),
          price: fc.double({ min: 0.01, max: 1000000 }).map(n => n.toFixed(18)),
          cid: fc.string({ minLength: 46, maxLength: 46 }).map(s => 'Qm' + s.slice(2)),
          researcher_address: fc.hexaString({ minLength: 40, maxLength: 40 }).map(s => '0x' + s),
          tx_hash: fc.hexaString({ minLength: 64, maxLength: 64 }).map(s => '0x' + s)
        }),
        (newDataset: NewDataset) => {
          // Insert dataset
          const inserted = insertDataset(newDataset)
          
          // Verify insertion returned correct data
          expect(inserted.id).toBe(newDataset.id)
          expect(inserted.title).toBe(newDataset.title)
          expect(inserted.description).toBe(newDataset.description)
          expect(inserted.price).toBe(newDataset.price)
          expect(inserted.cid).toBe(newDataset.cid)
          expect(inserted.researcher_address).toBe(newDataset.researcher_address)
          expect(inserted.tx_hash).toBe(newDataset.tx_hash)
          expect(inserted.upload_date).toBeTruthy()
          expect(inserted.purchase_count).toBe(0)
          
          // Retrieve by ID
          const retrieved = getDatasetById(newDataset.id)
          expect(retrieved).not.toBeNull()
          expect(retrieved?.id).toBe(newDataset.id)
          expect(retrieved?.title).toBe(newDataset.title)
          expect(retrieved?.description).toBe(newDataset.description)
          expect(retrieved?.price).toBe(newDataset.price)
          expect(retrieved?.cid).toBe(newDataset.cid)
          expect(retrieved?.researcher_address).toBe(newDataset.researcher_address)
          expect(retrieved?.tx_hash).toBe(newDataset.tx_hash)
          
          // Retrieve all datasets
          const allDatasets = getDatasets()
          expect(allDatasets.length).toBeGreaterThan(0)
          const found = allDatasets.find(d => d.id === newDataset.id)
          expect(found).toBeDefined()
          expect(found?.title).toBe(newDataset.title)
          
          // Retrieve by researcher
          const researcherDatasets = getDatasetsByResearcher(newDataset.researcher_address)
          expect(researcherDatasets.length).toBeGreaterThan(0)
          const foundByResearcher = researcherDatasets.find(d => d.id === newDataset.id)
          expect(foundByResearcher).toBeDefined()
          expect(foundByResearcher?.researcher_address).toBe(newDataset.researcher_address)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('getDatasetById returns null for non-existent dataset', () => {
    const result = getDatasetById('non-existent-id')
    expect(result).toBeNull()
  })

  test('getDatasetsByResearcher filters correctly by address', () => {
    const researcher1 = '0x1111111111111111111111111111111111111111'
    const researcher2 = '0x2222222222222222222222222222222222222222'
    
    insertDataset({
      id: 'dataset1',
      title: 'Dataset 1',
      description: 'Description 1',
      price: '1.0',
      cid: 'QmTest1111111111111111111111111111111111111111',
      researcher_address: researcher1,
      tx_hash: '0xabc123'
    })
    
    insertDataset({
      id: 'dataset2',
      title: 'Dataset 2',
      description: 'Description 2',
      price: '2.0',
      cid: 'QmTest2222222222222222222222222222222222222222',
      researcher_address: researcher2,
      tx_hash: '0xdef456'
    })
    
    const researcher1Datasets = getDatasetsByResearcher(researcher1)
    expect(researcher1Datasets.length).toBe(1)
    expect(researcher1Datasets[0].id).toBe('dataset1')
    
    const researcher2Datasets = getDatasetsByResearcher(researcher2)
    expect(researcher2Datasets.length).toBe(1)
    expect(researcher2Datasets[0].id).toBe('dataset2')
  })

  test('updatePurchaseCount increments correctly', () => {
    const dataset = insertDataset({
      id: 'dataset-test',
      title: 'Test Dataset',
      description: 'Test Description',
      price: '1.0',
      cid: 'QmTest3333333333333333333333333333333333333333',
      researcher_address: '0x3333333333333333333333333333333333333333',
      tx_hash: '0xtest123'
    })
    
    expect(dataset.purchase_count).toBe(0)
    
    updatePurchaseCount('dataset-test')
    const updated1 = getDatasetById('dataset-test')
    expect(updated1?.purchase_count).toBe(1)
    
    updatePurchaseCount('dataset-test')
    const updated2 = getDatasetById('dataset-test')
    expect(updated2?.purchase_count).toBe(2)
  })
})
