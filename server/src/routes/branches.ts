import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// GET /api/branches - get all active branches
router.get('/', async (req, res) => {
    console.log("GET /api/branches hit");
    try {
        const branches = await prisma.branch.findMany({
            where: { is_active: true },
            orderBy: { name: 'asc' }
        });
        res.json(branches);
    } catch (error: any) {
        console.error("GET /api/branches error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/branches/all - get all branches (including inactive, for admin)
router.get('/all', async (req, res) => {
    console.log("GET /api/branches/all hit");
    try {
        const branches = await prisma.branch.findMany({
            include: {
                masters: { include: { master: true } },
                services: { include: { service: true } }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json(branches);
    } catch (error: any) {
        console.error("GET /api/branches/all error:", error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/branches/:id - get branch with masters and services
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`GET /api/branches/${id} hit`);
    try {
        const branch = await prisma.branch.findUnique({
            where: { id },
            include: {
                masters: { include: { master: true } },
                services: { include: { service: true } }
            }
        });
        if (!branch) {
            return res.status(404).json({ error: 'Branch not found' });
        }
        res.json(branch);
    } catch (error: any) {
        console.error(`GET /api/branches/${id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/branches - create branch
router.post('/', async (req, res) => {
    const { name, address, phone, start_hour, end_hour, is_active } = req.body;
    console.log("POST /api/branches hit:", { name });
    try {
        const branch = await prisma.branch.create({
            data: {
                name,
                address,
                phone,
                start_hour: start_hour ?? 10,
                end_hour: end_hour ?? 20,
                is_active: is_active !== undefined ? is_active : true
            }
        });
        res.json(branch);
    } catch (error: any) {
        console.error("POST /api/branches error:", error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/branches/:id - update branch
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, phone, start_hour, end_hour, is_active } = req.body;
    console.log(`PUT /api/branches/${id} hit`);
    try {
        const branch = await prisma.branch.update({
            where: { id },
            data: {
                name,
                address,
                phone,
                start_hour,
                end_hour,
                is_active
            }
        });
        res.json(branch);
    } catch (error: any) {
        console.error(`PUT /api/branches/${id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/branches/:id - delete branch
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`DELETE /api/branches/${id} hit`);
    try {
        await prisma.branch.delete({ where: { id } });
        res.json({ success: true });
    } catch (error: any) {
        console.error(`DELETE /api/branches/${id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/branches/:id/masters - assign master to branch
router.post('/:id/masters', async (req, res) => {
    const { id: branch_id } = req.params;
    const { master_id } = req.body;
    console.log(`POST /api/branches/${branch_id}/masters hit:`, { master_id });
    try {
        const assignment = await prisma.masterBranch.create({
            data: { branch_id, master_id }
        });
        res.json(assignment);
    } catch (error: any) {
        console.error(`POST /api/branches/${branch_id}/masters error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/branches/:id/masters/:masterId - remove master from branch
router.delete('/:id/masters/:masterId', async (req, res) => {
    const { id: branch_id, masterId: master_id } = req.params;
    console.log(`DELETE /api/branches/${branch_id}/masters/${master_id} hit`);
    try {
        await prisma.masterBranch.deleteMany({
            where: { branch_id, master_id }
        });
        res.json({ success: true });
    } catch (error: any) {
        console.error(`DELETE /api/branches/${branch_id}/masters/${master_id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/branches/:id/services - assign service to branch
router.post('/:id/services', async (req, res) => {
    const { id: branch_id } = req.params;
    const { service_id } = req.body;
    console.log(`POST /api/branches/${branch_id}/services hit:`, { service_id });
    try {
        const assignment = await prisma.branchService.create({
            data: { branch_id, service_id }
        });
        res.json(assignment);
    } catch (error: any) {
        console.error(`POST /api/branches/${branch_id}/services error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/branches/:id/services/:serviceId - remove service from branch
router.delete('/:id/services/:serviceId', async (req, res) => {
    const { id: branch_id, serviceId: service_id } = req.params;
    console.log(`DELETE /api/branches/${branch_id}/services/${service_id} hit`);
    try {
        await prisma.branchService.deleteMany({
            where: { branch_id, service_id }
        });
        res.json({ success: true });
    } catch (error: any) {
        console.error(`DELETE /api/branches/${branch_id}/services/${service_id} error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/branches/:id/masters - get masters for branch (with their services)
router.get('/:id/masters', async (req, res) => {
    const { id: branch_id } = req.params;
    console.log(`GET /api/branches/${branch_id}/masters hit`);
    try {
        const masterBranches = await prisma.masterBranch.findMany({
            where: { branch_id },
            include: {
                master: {
                    include: {
                        services: {
                            include: { service: true }
                        }
                    }
                }
            }
        });
        // Transform to include services array directly on master
        const masters = masterBranches.map(mb => ({
            ...mb.master,
            services: mb.master.services.map(ms => ms.service)
        }));
        res.json(masters);
    } catch (error: any) {
        console.error(`GET /api/branches/${branch_id}/masters error:`, error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/branches/:id/services - get services available in branch (derived from masters)
router.get('/:id/services', async (req, res) => {
    const { id: branch_id } = req.params;
    console.log(`GET /api/branches/${branch_id}/services hit`);
    try {
        // Get all masters assigned to this branch
        const masterBranches = await prisma.masterBranch.findMany({
            where: { branch_id },
            include: {
                master: {
                    include: {
                        services: {
                            include: { service: true }
                        }
                    }
                }
            }
        });

        // Collect unique services from all masters
        const servicesMap = new Map();
        masterBranches.forEach(mb => {
            mb.master.services.forEach(ms => {
                if (ms.service && ms.service.is_active) {
                    servicesMap.set(ms.service.id, ms.service);
                }
            });
        });

        const services = Array.from(servicesMap.values());
        res.json(services);
    } catch (error: any) {
        console.error(`GET /api/branches/${branch_id}/services error:`, error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
