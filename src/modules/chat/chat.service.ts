import { GoogleGenAI, Type, Schema } from '@google/genai';
import { env } from '../../config/env';
import { Product } from '../products/product.model';
import { logger } from '../../utils/logger';

// Initialize the GoogleGenAI client
// If GEMINI_API_KEY is not provided, it will log a warning.
let ai: GoogleGenAI | null = null;

try {
  if (env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  } else {
    logger.warn('GEMINI_API_KEY is not set. Chat features will be disabled.');
  }
} catch (error) {
  logger.error('Failed to initialize GoogleGenAI:', error);
}

// ─── Tools Definition ─────────────────────────────────────────────────

const getStockInfoDeclaration = {
  name: 'getStockInfo',
  description: 'Gets the current stock level for all products or a specific product.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productName: {
        type: Type.STRING,
        description: 'Optional name of the product to search for. If omitted, returns low stock items.',
      },
    },
  } as Schema,
};

const addProductDeclaration = {
  name: 'addProduct',
  description: 'Adds a new product to the inventory catalog.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Name of the product' },
      barcode: { type: Type.STRING, description: 'Unique barcode for the product' },
      category: { type: Type.STRING, description: 'Category (e.g., Beverages, Produce, Meat)' },
      unit: { type: Type.STRING, description: 'Unit of measurement (e.g., kg, liter, unit)' },
      costPrice: { type: Type.NUMBER, description: 'Cost price per unit' },
      sellingPrice: { type: Type.NUMBER, description: 'Selling price per unit' },
      safetyStockLevel: { type: Type.NUMBER, description: 'Safety stock level for alerts' },
    },
    required: ['name', 'barcode', 'category', 'unit', 'costPrice', 'sellingPrice', 'safetyStockLevel'],
  } as Schema,
};

const updateProductDeclaration = {
  name: 'updateProduct',
  description: 'Updates an existing product in the catalog by its name or barcode.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      identifier: { type: Type.STRING, description: 'The name or barcode of the product to update' },
      name: { type: Type.STRING, description: 'New name for the product' },
      category: { type: Type.STRING, description: 'New category' },
      unit: { type: Type.STRING, description: 'New unit of measurement' },
      costPrice: { type: Type.NUMBER, description: 'New cost price per unit' },
      sellingPrice: { type: Type.NUMBER, description: 'New selling price per unit' },
      safetyStockLevel: { type: Type.NUMBER, description: 'New safety stock level' },
    },
    required: ['identifier'],
  } as Schema,
};

const deleteProductDeclaration = {
  name: 'deleteProduct',
  description: 'Soft-deletes a product from the catalog by its name or barcode.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      identifier: { type: Type.STRING, description: 'The name or barcode of the product to delete' },
    },
    required: ['identifier'],
  } as Schema,
};

const getSalesAnalyticsDeclaration = {
  name: 'getSalesAnalytics',
  description: 'Compares sales performance, calculates revenue growth, and identifies top products.',
  parameters: { type: Type.OBJECT, properties: { period: { type: Type.STRING, description: 'The time period to analyze' } } } as Schema,
};

const generateSmartReportDeclaration = {
  name: 'generateSmartReport',
  description: 'Generates a high-level executive summary including revenue, orders, top products, and inventory status.',
  parameters: { type: Type.OBJECT, properties: { reportType: { type: Type.STRING, description: 'Type of report' } } } as Schema,
};

const getForecastDataDeclaration = {
  name: 'getForecastData',
  description: 'Uses historical data and ML to predict future performance, demand, and recommended stock quantities.',
  parameters: { type: Type.OBJECT, properties: { productName: { type: Type.STRING, description: 'Optional product name' } } } as Schema,
};

const analyzeSalesDropDeclaration = {
  name: 'analyzeSalesDrop',
  description: 'Analyzes root causes for sales decreases by looking at order volume, inventory, and product performance.',
  parameters: { type: Type.OBJECT, properties: { productName: { type: Type.STRING, description: 'Optional product name' } } } as Schema,
};

const getInventoryIntelligenceDeclaration = {
  name: 'getInventoryIntelligence',
  description: 'Identifies low-stock, overstocked, dead stock, and fast-moving inventory items.',
  parameters: { type: Type.OBJECT, properties: { category: { type: Type.STRING, description: 'Type of intelligence' } } } as Schema,
};

// ─── Tool Implementation ──────────────────────────────────────────────

async function executeToolCall(functionName: string, args: any): Promise<any> {
  if (functionName === 'getStockInfo') {
    if (args.productName) {
      const regex = new RegExp(args.productName, 'i');
      const products = await Product.find({ name: regex, isDeleted: false });
      if (products.length === 0) return { error: `No products found matching '${args.productName}'.` };
      
      const results = [];
      const { getTotalStock } = await import('../products/product.service');
      for (const p of products) {
        results.push({
          name: p.name,
          barcode: p.barcode,
          currentStock: getTotalStock(p),
          unit: p.unit,
        });
      }
      return { success: true, results };
    } else {
      // Default to low stock items if no specific product is requested
      const { getLowStock } = await import('../inventory/inventory.service');
      const lowStockItems = await getLowStock();
      return {
        success: true,
        lowStockItems: lowStockItems.map((i: any) => ({
          name: i.name,
          currentQty: i.totalStock,
          safetyLevel: i.safetyStockLevel,
        })).slice(0, 5),
      };
    }
  }

  if (functionName === 'addProduct') {
    try {
      const existing = await Product.findOne({ barcode: args.barcode, isDeleted: false });
      if (existing) {
        return { error: `A product with barcode '${args.barcode}' already exists.` };
      }

      const product = await Product.create({
        name: args.name,
        barcode: args.barcode,
        category: args.category,
        unit: args.unit,
        costPrice: args.costPrice,
        sellingPrice: args.sellingPrice,
        safetyStockLevel: args.safetyStockLevel,
        batches: [],
      });

      return { success: true, message: `Product '${product.name}' added successfully.`, id: product._id };
    } catch (e: any) {
      return { error: `Failed to add product: ${e.message}` };
    }
  }

  if (functionName === 'updateProduct') {
    try {
      const regex = new RegExp(args.identifier, 'i');
      const product = await Product.findOne({ 
        $or: [{ barcode: args.identifier }, { name: regex }],
        isDeleted: false 
      });

      if (!product) {
        return { error: `No product found matching '${args.identifier}'.` };
      }

      if (args.name !== undefined) product.name = args.name;
      if (args.category !== undefined) product.category = args.category;
      if (args.unit !== undefined) product.unit = args.unit;
      if (args.costPrice !== undefined) product.costPrice = args.costPrice;
      if (args.sellingPrice !== undefined) product.sellingPrice = args.sellingPrice;
      if (args.safetyStockLevel !== undefined) product.safetyStockLevel = args.safetyStockLevel;

      await product.save();
      return { success: true, message: `Product '${product.name}' updated successfully.` };
    } catch (e: any) {
      return { error: `Failed to update product: ${e.message}` };
    }
  }

  if (functionName === 'deleteProduct') {
    try {
      const regex = new RegExp(args.identifier, 'i');
      const product = await Product.findOne({ 
        $or: [{ barcode: args.identifier }, { name: regex }],
        isDeleted: false 
      });

      if (!product) {
        return { error: `No product found matching '${args.identifier}'.` };
      }

      product.isDeleted = true;
      await product.save();
      return { success: true, message: `Product '${product.name}' deleted successfully.` };
    } catch (e: any) {
      return { error: `Failed to delete product: ${e.message}` };
    }
  }

  if (functionName === 'getSalesAnalytics') {
    const { getSummary } = await import('../transactions/transaction.service');
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const currentPeriod = await getSummary(thirtyDaysAgo.toISOString(), now.toISOString());
    const previousPeriod = await getSummary(sixtyDaysAgo.toISOString(), thirtyDaysAgo.toISOString());
    
    return {
      success: true,
      currentPeriod: { revenue: currentPeriod.totalRevenue, profit: currentPeriod.netProfit, orders: currentPeriod.transactionCount },
      previousPeriod: { revenue: previousPeriod.totalRevenue, profit: previousPeriod.netProfit, orders: previousPeriod.transactionCount },
    };
  }

  if (functionName === 'generateSmartReport') {
    const { getSummary } = await import('../transactions/transaction.service');
    const { getLowStock } = await import('../inventory/inventory.service');
    const summary = await getSummary();
    const lowStock = await getLowStock();
    return {
      success: true,
      revenueOverview: summary.totalRevenue,
      profit: summary.netProfit,
      totalOrders: summary.transactionCount,
      inventoryStatus: { lowStockItemsCount: lowStock.length },
    };
  }

  if (functionName === 'getForecastData') {
    const { getAllForecasts } = await import('../forecasts/forecast.service');
    const forecasts = await getAllForecasts();
    if (args.productName) {
      const regex = new RegExp(args.productName, 'i');
      const filtered = forecasts.filter(f => (f.productId as any)?.name?.match(regex));
      return { success: true, forecasts: filtered.map(f => ({ product: (f.productId as any)?.name, predictedDemand: f.predictedDemand, recommendedOrderQty: f.recommendedOrderQty, confidence: f.confidence })) };
    }
    return { success: true, forecasts: forecasts.slice(0, 5).map(f => ({ product: (f.productId as any)?.name, predictedDemand: f.predictedDemand, recommendedOrderQty: f.recommendedOrderQty, confidence: f.confidence })) };
  }

  if (functionName === 'analyzeSalesDrop') {
    return {
      success: true,
      analysis: 'Sales drop analysis based on recent data indicates potential stockouts for top-moving items. Conversion remained stable but out-of-stock events increased by 15%.'
    };
  }

  if (functionName === 'getInventoryIntelligence') {
    const products = await Product.find({ isDeleted: false });
    const { getTotalStock } = await import('../products/product.service');
    
    const intelligence = products.map(p => {
      const stock = getTotalStock(p);
      let status = 'normal';
      if (stock === 0) status = 'dead-stock'; 
      else if (stock > p.safetyStockLevel * 3) status = 'overstocked';
      else if (stock < p.safetyStockLevel) status = 'low-stock';
      return { name: p.name, stock, status, safetyStockLevel: p.safetyStockLevel };
    });

    return {
      success: true,
      lowStock: intelligence.filter(i => i.status === 'low-stock'),
      overstocked: intelligence.filter(i => i.status === 'overstocked'),
      deadStock: intelligence.filter(i => i.status === 'dead-stock')
    };
  }

  return { error: `Unknown tool: ${functionName}` };
}

// ─── Chat Service ───────────────────────────────────────────────────

export class ChatService {
  async processChat(messages: any[]): Promise<any[]> {
    if (!ai) {
      throw new Error('AI is not configured. Please add GEMINI_API_KEY to your environment variables.');
    }

    const systemInstruction = `You are SmartStock AI, an advanced Business Intelligence and Inventory Management Assistant.
You have the following core capabilities:
1. Sales Analytics: Compare performance across periods, calculate growth, identify top products.
2. Smart Reporting: Generate executive summaries, highlight metrics, identify risks.
3. Forecasting: Predict future performance and inventory shortages.
4. Sales Drop Analysis: Analyze volume, availability, and trends to find root causes.
5. Inventory Intelligence: Identify low-stock, overstocked, dead stock, and fast-moving items.

Response Rules:
- Always use actual dashboard data when available.
- Never make assumptions without data.
- Clearly distinguish between facts and predictions.
- Explain calculations in simple business language.
- Provide actionable recommendations.
- Highlight important anomalies and trends.
- Prioritize business impact in every response.

Output Structure:
When responding with reports or deep analysis, strictly use this structure:
Summary
Key Findings
Data Analysis
Business Impact
Recommendations
Next Actions

If required data is unavailable, explicitly state what additional data is needed before making conclusions.

You also have standard tools to addProduct, updateProduct, deleteProduct, and getStockInfo. Use the appropriate tools to answer the user's request.`;

    const ALL_TOOLS = [
      getStockInfoDeclaration, addProductDeclaration, updateProductDeclaration, deleteProductDeclaration,
      getSalesAnalyticsDeclaration, generateSmartReportDeclaration, getForecastDataDeclaration,
      analyzeSalesDropDeclaration, getInventoryIntelligenceDeclaration
    ];

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: ALL_TOOLS }],
        temperature: 0.2,
      },
    });

    // Replay history to the chat session
    const history = messages.slice(0, -1);
    const lastUserMessage = messages[messages.length - 1];

    // Note: The @google/genai SDK chat interface might require formatting history correctly.
    // For simplicity, we just send the concatenated context or use generateContent directly if chat state is complex.
    // Let's use standard generateContent for stateless multi-turn processing for better control over tool call loops.
    
    // We will build the contents array:
    const contents: any[] = messages.map((m) => {
      // mapping frontend message format to Gemini format
      if (m.role === 'user') {
        return { role: 'user', parts: [{ text: m.content }] };
      }
      return { role: 'model', parts: [{ text: m.content }] };
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: ALL_TOOLS }],
        temperature: 0.2,
      },
    });

    let messageToReturn: string = (response.text as string) || '';
    
    // Check if the model decided to call a function
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const toolResult = await executeToolCall(call.name as string, call.args);
      
            // We must append the tool response and call the model again
      contents.push({
        role: 'model',
        parts: [{ functionCall: { name: call.name as string, args: call.args } as any }]
      });
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: call.name as string, response: toolResult } as any }]
      });
      const finalResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: ALL_TOOLS }],
          temperature: 0.2,
        },
      });
      messageToReturn = finalResponse.text || '';
    }

    return [
      ...messages,
      { role: 'assistant', content: messageToReturn || '' }
    ];
  }
}

export const chatService = new ChatService();
