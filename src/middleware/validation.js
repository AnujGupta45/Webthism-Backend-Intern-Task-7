import { z } from 'zod';
import prisma from '../config/db.js';

// 1. Zod schemas for validation
export const campaignSchema = z.object({
  name: z.string().trim().min(3, { message: "Campaign name must be at least 3 characters" }),
  description: z.string().trim().optional().nullable(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).optional().default("ACTIVE"),
});

export const formSchema = z.object({
  campaignId: z.string().uuid({ message: "Invalid Campaign ID format (must be UUID)" }),
  name: z.string().trim().min(2, { message: "Form name must be at least 2 characters" }),
  fields: z.array(
    z.object({
      name: z.string().trim().min(1, { message: "Field name is required" }),
      label: z.string().trim().min(1, { message: "Field label is required" }),
      type: z.enum(["text", "email", "number", "textarea"]),
      required: z.boolean().default(false),
    })
  ).min(1, { message: "Form must have at least one field" }),
});

export const leadCaptureSchema = z.object({
  campaignId: z.string().uuid({ message: "Invalid Campaign ID format (must be UUID)" }).optional().nullable(),
  formId: z.string().uuid({ message: "Invalid Form ID format (must be UUID)" }).optional().nullable(),
  firstName: z.string().trim().min(1, { message: "First name is required" }),
  lastName: z.string().trim().optional().nullable(),
  email: z.string().trim().toLowerCase().email({ message: "Invalid email address" }),
  phone: z.string().trim().regex(/^(\+?\d{1,3}[- ]?)?\d{10}$/, { message: "Invalid phone format. Must be 10 digits (optional country code prefix)" }).optional().nullable().or(z.literal('')),
  submittedData: z.record(z.any()).optional().default({}),
});

// 2. Campaign Validation Middleware
export function validateCampaign(req, res, next) {
  const result = campaignSchema.safeParse(req.body);
  if (!result.success) {
    const errors = {};
    result.error.issues.forEach(err => {
      errors[err.path.join('.')] = err.message;
    });
    return res.status(400).json({ success: false, message: "Campaign validation failed", errors });
  }
  req.body = result.data;
  next();
}

// 3. Form Validation Middleware
export function validateForm(req, res, next) {
  const result = formSchema.safeParse(req.body);
  if (!result.success) {
    const errors = {};
    result.error.issues.forEach(err => {
      errors[err.path.join('.')] = err.message;
    });
    return res.status(400).json({ success: false, message: "Form validation failed", errors });
  }
  // Store dynamic fields as serialized JSON string for database storage
  req.body = {
    ...result.data,
    fields: JSON.stringify(result.data.fields)
  };
  next();
}

// 4. Lead Capture Validation Middleware
export async function validateLeadCapture(req, res, next) {
  try {
    const result = leadCaptureSchema.safeParse(req.body);
    
    if (!result.success) {
      const errors = {};
      result.error.issues.forEach(err => {
        errors[err.path.join('.')] = err.message;
      });
      return res.status(400).json({
        success: false,
        message: "Lead validation failed",
        errors
      });
    }

    req.body = result.data;
    const { formId, submittedData } = req.body;

    // Apply dynamic fields validation if a Form ID is provided
    if (formId) {
      const form = await prisma.form.findUnique({
        where: { id: formId }
      });

      if (!form) {
        return res.status(404).json({
          success: false,
          message: `Form with ID '${formId}' not found`
        });
      }

      let formFieldsConfig = [];
      try {
        formFieldsConfig = JSON.parse(form.fields);
      } catch (err) {
        console.error("Error parsing form fields metadata:", err);
      }

      const dynamicErrors = {};
      
      formFieldsConfig.forEach(field => {
        const value = submittedData[field.name];
        
        // 1) Required check
        if (field.required) {
          if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            dynamicErrors[`submittedData.${field.name}`] = `${field.label || field.name} is required`;
          }
        }

        // 2) Basic format checks
        if (value !== undefined && value !== null && value !== '') {
          if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            dynamicErrors[`submittedData.${field.name}`] = `Invalid email address format for ${field.label}`;
          }
          if (field.type === 'number' && isNaN(Number(value))) {
            dynamicErrors[`submittedData.${field.name}`] = `${field.label} must be a valid number`;
          }
        }
      });

      if (Object.keys(dynamicErrors).length > 0) {
        return res.status(400).json({
          success: false,
          message: "Form submission failed dynamic field requirements",
          errors: dynamicErrors
        });
      }
    }

    next();
  } catch (error) {
    console.error("Validation Middleware Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during validation"
    });
  }
}
