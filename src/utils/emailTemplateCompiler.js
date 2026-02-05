import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const compileTemplate = async (templateName, data) => {
    try {
        const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);

        // Check if template exists
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template ${templateName} not found at ${templatePath}`);
        }

        const source = fs.readFileSync(templatePath, 'utf-8');
        const template = handlebars.compile(source);

        // Add current year to data if not present
        if (!data.year) {
            data.year = new Date().getFullYear();
        }

        return template(data);
    } catch (error) {
        console.error(`Error compiling template ${templateName}:`, error);
        throw error;
    }
};
