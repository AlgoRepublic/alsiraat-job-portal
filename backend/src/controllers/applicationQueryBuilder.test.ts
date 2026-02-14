import assert from 'assert';
import { buildApplicationQuery } from './applicationQueryBuilder.ts';

// Mock User Roles
const UserRole = {
    GLOBAL_ADMIN: 'Global Admin',
    ADMIN: 'Admin',
    APPLICANT: 'Applicant'
};

// Mock Users
const mockAdmin = {
    _id: 'admin_id',
    role: UserRole.GLOBAL_ADMIN,
    organisation: null
};

const mockOrgUser = {
    _id: 'org_user_id',
    role: 'Task Manager',
    organisation: 'org_id'
};

const mockIndependentUser = {
    _id: 'indep_user_id',
    role: 'Task Creator',
    organisation: null
};

// Mock Task Model
const mockTasks = [
    { _id: 'task_org_1', organisation: 'org_id', createdBy: 'other_user' },
    { _id: 'task_indep_1', organisation: null, createdBy: 'indep_user_id' },
    { _id: 'task_other_1', organisation: 'other_org', createdBy: 'other_user' }
];

const mockTaskModel = {
    findById: async (id: string) => mockTasks.find(t => t._id === id) || null,
    find: (query: any) => {
        let results = mockTasks;
        if (query.organisation) {
            results = results.filter(t => t.organisation === query.organisation);
        }
        if (query.createdBy) {
            results = results.filter(t => t.createdBy === query.createdBy);
        }
        // mocking .select('_id') by returning objects with _id property (which they have)
        return {
            select: (field: string) => results,
            map: (fn: any) => results.map(fn)
        };
    }
};

const deps = { TaskModel: mockTaskModel };

async function runTests() {
    console.log('Running Application Query Builder Tests...');

    // Test 1: Admin should see all (no query filter) when no taskId provided
    try {
        const query = await buildApplicationQuery(mockAdmin, undefined, { hasFullAccess: true, hasOwnAccess: true }, deps, UserRole);
        assert.deepStrictEqual(query, {}, 'Admin should have empty query (all applications)');
        console.log('✅ Test 1 Passed: Admin sees all');
    } catch (e) {
        console.error('❌ Test 1 Failed:', e);
    }

    // Test 2: Org User with Full Access (no taskId) should see tasks from their org
    try {
        const query = await buildApplicationQuery(mockOrgUser, undefined, { hasFullAccess: true, hasOwnAccess: true }, deps, UserRole);
        // Expect query.task to be in list of org tasks
        assert(query.task, 'Query should have task filter');
        assert(query.task.$in, 'Query task filter should have $in');
        assert(query.task.$in.includes('task_org_1'), 'Should include org task');
        console.log('✅ Test 2 Passed: Org User sees org tasks');
    } catch (e) {
        console.error('❌ Test 2 Failed:', e);
    }

    // Test 3: Independent User with Full Access (no taskId) should see tasks they created
    try {
        const query = await buildApplicationQuery(mockIndependentUser, undefined, { hasFullAccess: true, hasOwnAccess: true }, deps, UserRole);
        assert(query.task.$in.includes('task_indep_1'), 'Should include created task');
        assert(!query.task.$in.includes('task_org_1'), 'Should NOT include other tasks');
        console.log('✅ Test 3 Passed: Independent User sees created tasks');
    } catch (e) {
        console.error('❌ Test 3 Failed:', e);
    }

    // Test 4: Specific Task (taskId provided) - Full Access checks if user can view task
    try {
        // User requesting access to task_org_1 (their org)
        const query = await buildApplicationQuery(mockOrgUser, 'task_org_1', { hasFullAccess: true, hasOwnAccess: true }, deps, UserRole);
        assert.strictEqual(query.task, 'task_org_1');
        assert.strictEqual(query.applicant, undefined, 'Should not filter by applicant if full access');
        console.log('✅ Test 4 Passed: Org User allowed access to org task');
    } catch (e) {
        console.error('❌ Test 4 Failed:', e);
    }

    // Test 5: Specific Task - Access Denied (User from other org)
    try {
        await buildApplicationQuery(mockOrgUser, 'task_other_1', { hasFullAccess: true, hasOwnAccess: true }, deps, UserRole);
        console.error('❌ Test 5 Failed: Should have thrown error');
    } catch (e: any) {
        if (e.message.includes("You don't have permission")) {
             console.log('✅ Test 5 Passed: Access correctly denied for other org task');
        } else {
             console.error('❌ Test 5 Failed: Wrong error message', e.message);
        }
    }
}

runTests();
