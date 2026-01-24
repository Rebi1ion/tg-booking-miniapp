import { Router } from 'express';
import prisma from '../utils/prisma';

const router = Router();

interface ServiceImport {
    name: string;
    description?: string;
    category?: string;
    subcategory?: string;
    hall?: string;
    duration_minutes?: number;
    price?: number;
    is_active?: boolean;
}

interface ImportServicesRequest {
    services: ServiceImport[];
    branch_id?: string;  // Optional: assign all services to this branch
    defaults?: {
        duration_minutes?: number;
        price?: number;
        category?: string;
        subcategory?: string;
        hall?: string;
    };
}

// POST /api/import/services - Bulk import services
router.post('/services', async (req, res) => {
    const { services, branch_id, defaults } = req.body as ImportServicesRequest;
    console.log(`POST /api/import/services hit: ${services?.length || 0} services`);

    if (!services || !Array.isArray(services) || services.length === 0) {
        return res.status(400).json({
            error: 'Services array is required and must not be empty'
        });
    }

    const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
        services_ids: [] as string[]
    };

    try {
        for (const svc of services) {
            try {
                // Validate name
                if (!svc.name || svc.name.trim() === '') {
                    results.skipped++;
                    results.errors.push(`Skipped: empty name`);
                    continue;
                }

                const name = svc.name.trim();

                // Apply defaults for missing fields
                const duration = svc.duration_minutes ?? defaults?.duration_minutes ?? 30;
                const price = svc.price ?? defaults?.price ?? 0;
                const category = svc.category ?? defaults?.category ?? 'Без категории';
                const subcategory = svc.subcategory ?? defaults?.subcategory ?? null;
                const hall = svc.hall ?? defaults?.hall ?? null;

                // Upsert: create or update by name
                const existing = await prisma.service.findFirst({
                    where: { name: name }
                });

                let service;
                if (existing) {
                    // Update existing service
                    service = await prisma.service.update({
                        where: { id: existing.id },
                        data: {
                            description: svc.description ?? existing.description,
                            duration_minutes: duration,
                            price: price,
                            category: category,
                            subcategory: subcategory,
                            hall: hall,
                            is_active: svc.is_active ?? existing.is_active
                        }
                    });
                    results.updated++;
                } else {
                    // Create new service
                    service = await prisma.service.create({
                        data: {
                            name,
                            description: svc.description,
                            duration_minutes: duration,
                            price: price,
                            category: category,
                            subcategory: subcategory,
                            hall: hall,
                            is_active: svc.is_active ?? true
                        }
                    });
                    results.created++;
                }

                results.services_ids.push(service.id);

                // Assign to branch if specified
                if (branch_id && service) {
                    try {
                        await prisma.branchService.upsert({
                            where: {
                                branch_id_service_id: {
                                    branch_id,
                                    service_id: service.id
                                }
                            },
                            create: {
                                branch_id,
                                service_id: service.id
                            },
                            update: {}
                        });
                    } catch (err) {
                        // Ignore if branch doesn't exist
                        console.error(`Failed to assign service to branch:`, err);
                    }
                }
            } catch (err: any) {
                results.skipped++;
                results.errors.push(`Error with "${svc.name}": ${err.message}`);
            }
        }

        console.log(`Import completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`);

        res.json({
            success: true,
            message: `Imported ${results.created + results.updated} services`,
            ...results
        });
    } catch (error: any) {
        console.error('POST /api/import/services error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/import/template - Get JSON template
router.get('/template', (req, res) => {
    const template = {
        services: [
            {
                name: "Стрижка женская",
                description: "Стрижка любой сложности с укладкой",
                category: "Стрижки",
                subcategory: "Женские",
                hall: "Зал 1",
                duration_minutes: 60,
                price: 2500
            },
            {
                name: "Стрижка мужская",
                description: "Классическая мужская стрижка",
                category: "Стрижки",
                subcategory: "Мужские",
                hall: "Зал 2",
                duration_minutes: 30,
                price: 1000
            },
            {
                name: "Маникюр классический",
                description: "Маникюр с покрытием гель-лаком",
                category: "Маникюр",
                duration_minutes: 90,
                price: 1800
            }
        ],
        defaults: {
            duration_minutes: 30,
            price: 0,
            category: "Без категории",
            subcategory: null,
            hall: null
        },
        branch_id: "optional-uuid-of-branch"
    };

    res.json(template);
});

export default router;
