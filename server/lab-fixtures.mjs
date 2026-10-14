// Shared, source-owned synthetic fixtures; never real LIS data.
import fixtures from '../shared/lab-fixtures.json' with {type:'json'};
/** @param {import('../src/clinical/model').Identity} identity
 * @param {number} version
 * @param {'baseline'|'normal'|'extended'} [variant]
 * @returns {import('../src/clinical/lab-reader/model').LabReport} */
export function labFixture(identity,version,variant='baseline'){
 const template=/** @type {import('../src/clinical/lab-reader/model').LabReport} */(structuredClone(fixtures[variant]));
 return {...template,id:'LAB-'+identity.object,identity:{...identity},version};
}
