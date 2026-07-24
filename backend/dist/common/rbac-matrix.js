"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBAC_MATRIX = void 0;
exports.RBAC_MATRIX = [
    {
        role: 'admin',
        summary: 'Full system access',
        capabilities: [
            'Create staff users and assign roles (admin / lawyer / clerk)',
            'Register clients (auto portal account)',
            'Configure system settings',
            'View audit logs',
            'Firm-wide clients, cases, documents, appointments',
            'Delete clients and cases',
        ],
    },
    {
        role: 'lawyer',
        summary: 'Assigned matters only',
        capabilities: [
            'View/update cases assigned to them',
            'Access firm client records',
            'Upload documents to assigned cases',
            'Schedule appointments for assigned cases/clients',
            'Cannot reassign cases to other lawyers',
            'Cannot manage users, settings, or audit',
        ],
    },
    {
        role: 'clerk',
        summary: 'Firm-wide administrative assist',
        capabilities: [
            'Register clients (creates portal login: email + phone temp password)',
            'Create/update cases and assign lawyers',
            'Manage appointments and documents',
            'Cannot create staff users or assign roles',
            'Cannot manage settings or audit',
            'Cannot delete clients or cases',
        ],
    },
    {
        role: 'client',
        summary: 'Portal: own linked client profile',
        capabilities: [
            'First login with email + phone temporary password',
            'Must change password before using the portal',
            'View own cases (linked Client via User.clientId)',
            'View/upload documents on own cases',
            'View own appointments',
            'Receive own notifications',
        ],
    },
];
