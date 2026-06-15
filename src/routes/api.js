import express from 'express';
import prisma from '../config/db.js';
import { validateCampaign, validateForm, validateLeadCapture } from '../middleware/validation.js';

const router = express.Router();

// --- CAMPAIGN ENDPOINTS ---

// GET /api/campaigns - List all campaigns with aggregate stats
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        _count: {
          select: { forms: true, leads: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/campaigns/:id - Get single campaign details
router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        forms: true,
        leads: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/campaigns - Create a campaign
router.post('/campaigns', validateCampaign, async (req, res) => {
  try {
    const campaign = await prisma.campaign.create({
      data: req.body
    });
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// --- FORM ENDPOINTS ---

// GET /api/forms - List all forms with campaign relations
router.get('/forms', async (req, res) => {
  try {
    const forms = await prisma.form.findMany({
      include: {
        campaign: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    // Parse the JSON fields back to object array for output response
    const parsedForms = forms.map(f => ({
      ...f,
      fields: JSON.parse(f.fields)
    }));
    res.json({ success: true, data: parsedForms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/forms/:id - Get single form details
router.get('/forms/:id', async (req, res) => {
  try {
    const form = await prisma.form.findUnique({
      where: { id: req.params.id },
      include: { campaign: { select: { name: true } } }
    });
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    res.json({
      success: true,
      data: {
        ...form,
        fields: JSON.parse(form.fields)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/forms - Create a form
router.post('/forms', validateForm, async (req, res) => {
  try {
    const form = await prisma.form.create({
      data: req.body
    });
    res.status(201).json({
      success: true,
      data: {
        ...form,
        fields: JSON.parse(form.fields)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// --- LEAD CAPTURE ENDPOINTS ---

// GET /api/leads - List all leads
router.get('/leads', async (req, res) => {
  try {
    const { campaignId, formId } = req.query;
    const filter = {};
    if (campaignId) filter.campaignId = campaignId;
    if (formId) filter.formId = formId;

    const leads = await prisma.lead.findMany({
      where: filter,
      include: {
        campaign: { select: { name: true } },
        form: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const parsedLeads = leads.map(l => ({
      ...l,
      submittedData: JSON.parse(l.submittedData)
    }));
    
    res.json({ success: true, data: parsedLeads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/leads/:id - Single lead details
router.get('/leads/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        campaign: { select: { name: true } },
        form: { select: { name: true } },
        contacts: true
      }
    });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.json({
      success: true,
      data: {
        ...lead,
        submittedData: JSON.parse(lead.submittedData)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/leads/capture - Core lead capture ingestion
router.post('/leads/capture', validateLeadCapture, async (req, res) => {
  try {
    const { campaignId, formId, firstName, lastName, email, phone, submittedData } = req.body;

    // 1. If formId is set, fetch form to inherit its campaignId if not explicitly provided
    let resolvedCampaignId = campaignId;
    if (formId && !resolvedCampaignId) {
      const form = await prisma.form.findUnique({ where: { id: formId } });
      if (form) {
        resolvedCampaignId = form.campaignId;
      }
    }

    // 2. Write lead to database
    const lead = await prisma.lead.create({
      data: {
        campaignId: resolvedCampaignId || null,
        formId: formId || null,
        firstName,
        lastName,
        email,
        phone,
        submittedData: JSON.stringify(submittedData)
      }
    });

    // 3. Upsert Contact profile based on email
    let contact;
    const existingContact = await prisma.contact.findUnique({
      where: { email }
    });

    if (existingContact) {
      // Update existing contact record with new lead details if provided
      const updatedData = {
        leadId: lead.id, // Update to link with the latest lead
      };
      if (firstName) updatedData.firstName = firstName;
      if (lastName) updatedData.lastName = lastName;
      if (phone) updatedData.phone = phone;

      contact = await prisma.contact.update({
        where: { email },
        data: updatedData
      });
      console.log(`Updated contact ID: ${contact.id} from incoming lead.`);
    } else {
      // Create a brand new CRM contact profile
      contact = await prisma.contact.create({
        data: {
          leadId: lead.id,
          firstName,
          lastName,
          email,
          phone,
          notes: `Profile initialized from captured lead on ${new Date().toLocaleDateString()}`
        }
      });
      console.log(`Created new contact ID: ${contact.id} from incoming lead.`);
    }

    res.status(201).json({
      success: true,
      message: "Lead captured successfully",
      data: {
        lead: {
          ...lead,
          submittedData
        },
        contact
      }
    });
  } catch (error) {
    console.error("Lead capture error:", error);
    res.status(500).json({ success: false, message: "Internal server error during lead capture" });
  }
});


// --- CONTACTS ENDPOINTS ---

// GET /api/contacts - List all CRM contacts
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/contacts/:id - Get contact details
router.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: req.params.id },
      include: {
        lead: true
      }
    });
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }
    if (contact.lead) {
      contact.lead.submittedData = JSON.parse(contact.lead.submittedData);
    }
    res.json({ success: true, data: contact });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
