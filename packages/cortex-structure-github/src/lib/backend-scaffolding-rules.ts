/**
 * Backend Scaffolding Rules and Templates
 * Provides standardized templates and patterns for backend development
 */

export interface BackendTemplate {
	name: string;
	description: string;
	framework: string[];
	language: string[];
	files: BackendFile[];
	dependencies?: string[];
}

export interface BackendFile {
	path: string;
	content: string;
	conditions?: string[];
}

// Express.js Templates
export const EXPRESS_TEMPLATES: BackendTemplate[] = [
	{
		name: 'express-controller',
		description: 'Express.js controller with TypeScript',
		framework: ['express'],
		language: ['typescript'],
		files: [
			{
				path: 'src/controllers/{{controllerName}}.controller.ts',
				content: `import { Request, Response, NextFunction } from 'express';
import { {{ServiceName}}Service } from '../services/{{serviceName}}.service';
import { validate{{ModelName}} } from '../validators/{{modelName}}.validator';
import { ApiResponse } from '../types/api.types';

export class {{ControllerName}}Controller {
  private {{serviceName}}Service: {{ServiceName}}Service;

  constructor() {
    this.{{serviceName}}Service = new {{ServiceName}}Service();
  }

  /**
   * Get all {{modelName}}s
   */
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const items = await this.{{serviceName}}Service.findAll();
      const response: ApiResponse = {
        success: true,
        data: items,
        message: '{{ModelName}}s retrieved successfully'
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get {{modelName}} by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const item = await this.{{serviceName}}Service.findById(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: '{{ModelName}} not found'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: item,
        message: '{{ModelName}} retrieved successfully'
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new {{modelName}}
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = validate{{ModelName}}(req.body);
      const newItem = await this.{{serviceName}}Service.create(validatedData);

      const response: ApiResponse = {
        success: true,
        data: newItem,
        message: '{{ModelName}} created successfully'
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update {{modelName}}
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const validatedData = validate{{ModelName}}(req.body);
      const updatedItem = await this.{{serviceName}}Service.update(id, validatedData);

      if (!updatedItem) {
        return res.status(404).json({
          success: false,
          message: '{{ModelName}} not found'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: updatedItem,
        message: '{{ModelName}} updated successfully'
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete {{modelName}}
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.{{serviceName}}Service.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: '{{ModelName}} not found'
        });
      }

      const response: ApiResponse = {
        success: true,
        message: '{{ModelName}} deleted successfully'
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}
`,
			},
			{
				path: 'src/services/{{serviceName}}.service.ts',
				content: `import { {{ModelName}} } from '../models/{{modelName}}.model';
import { Create{{ModelName}}Dto, Update{{ModelName}}Dto } from '../dto/{{modelName}}.dto';

export class {{ServiceName}}Service {
  /**
   * Find all {{modelName}}s
   */
  async findAll(): Promise<{{ModelName}}[]> {
    // Implementation depends on your data layer (e.g., database, ORM)
    throw new Error('Method not implemented');
  }

  /**
   * Find {{modelName}} by ID
   */
  async findById(id: string): Promise<{{ModelName}} | null> {
    // Implementation depends on your data layer
    throw new Error('Method not implemented');
  }

  /**
   * Create new {{modelName}}
   */
  async create(data: Create{{ModelName}}Dto): Promise<{{ModelName}}> {
    // Implementation depends on your data layer
    throw new Error('Method not implemented');
  }

  /**
   * Update {{modelName}}
   */
  async update(id: string, data: Update{{ModelName}}Dto): Promise<{{ModelName}} | null> {
    // Implementation depends on your data layer
    throw new Error('Method not implemented');
  }

  /**
   * Delete {{modelName}}
   */
  async delete(id: string): Promise<boolean> {
    // Implementation depends on your data layer
    throw new Error('Method not implemented');
  }

  /**
   * Find {{modelName}}s by criteria
   */
  async findByCriteria(criteria: Partial<{{ModelName}}>): Promise<{{ModelName}}[]> {
    // Implementation depends on your data layer
    throw new Error('Method not implemented');
  }
}
`,
			},
			{
				path: 'src/routes/{{routeName}}.routes.ts',
				content: `import { Router } from 'express';
import { {{ControllerName}}Controller } from '../controllers/{{controllerName}}.controller';
import { auth } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { {{modelName}}ValidationSchema } from '../schemas/{{modelName}}.schema';

const router = Router();
const {{controllerName}}Controller = new {{ControllerName}}Controller();

/**
 * @route GET /api/{{routePath}}
 * @desc Get all {{modelName}}s
 * @access Public/Private (adjust as needed)
 */
router.get('/', {{controllerName}}Controller.getAll);

/**
 * @route GET /api/{{routePath}}/:id
 * @desc Get {{modelName}} by ID
 * @access Public/Private (adjust as needed)
 */
router.get('/:id', {{controllerName}}Controller.getById);

/**
 * @route POST /api/{{routePath}}
 * @desc Create new {{modelName}}
 * @access Private (adjust as needed)
 */
router.post(
  '/',
  auth, // Remove if public
  validateRequest({{modelName}}ValidationSchema),
  {{controllerName}}Controller.create
);

/**
 * @route PUT /api/{{routePath}}/:id
 * @desc Update {{modelName}}
 * @access Private (adjust as needed)
 */
router.put(
  '/:id',
  auth, // Remove if public
  validateRequest({{modelName}}ValidationSchema),
  {{controllerName}}Controller.update
);

/**
 * @route DELETE /api/{{routePath}}/:id
 * @desc Delete {{modelName}}
 * @access Private (adjust as needed)
 */
router.delete('/:id', auth, {{controllerName}}Controller.delete);

export default router;
`,
			},
		],
	},
];

// FastAPI Templates
export const FASTAPI_TEMPLATES: BackendTemplate[] = [
	{
		name: 'fastapi-router',
		description: 'FastAPI router with Pydantic models',
		framework: ['fastapi'],
		language: ['python'],
		files: [
			{
				path: 'app/routers/{{router_name}}.py',
				content: `from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import {{ModelName}}
from ..schemas import {{SchemaName}}Create, {{SchemaName}}Update, {{SchemaName}}Response
from ..services.{{service_name}}_service import {{ServiceName}}Service

router = APIRouter(
    prefix="/{{route_path}}",
    tags=["{{tags}}"]
)

@router.get("/", response_model=List[{{SchemaName}}Response])
async def get_{{plural_name}}(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all {{model_description}}s"""
    service = {{ServiceName}}Service(db)
    items = service.get_all(skip=skip, limit=limit)
    return items

@router.get("/{item_id}", response_model={{SchemaName}}Response)
async def get_{{singular_name}}(
    item_id: int,
    db: Session = Depends(get_db)
):
    """Get {{model_description}} by ID"""
    service = {{ServiceName}}Service(db)
    item = service.get_by_id(item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="{{ModelName}} not found"
        )
    return item

@router.post("/", response_model={{SchemaName}}Response, status_code=status.HTTP_201_CREATED)
async def create_{{singular_name}}(
    item: {{SchemaName}}Create,
    db: Session = Depends(get_db)
):
    """Create new {{model_description}}"""
    service = {{ServiceName}}Service(db)
    return service.create(item)

@router.put("/{item_id}", response_model={{SchemaName}}Response)
async def update_{{singular_name}}(
    item_id: int,
    item_update: {{SchemaName}}Update,
    db: Session = Depends(get_db)
):
    """Update {{model_description}}"""
    service = {{ServiceName}}Service(db)
    item = service.update(item_id, item_update)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="{{ModelName}} not found"
        )
    return item

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_{{singular_name}}(
    item_id: int,
    db: Session = Depends(get_db)
):
    """Delete {{model_description}}"""
    service = {{ServiceName}}Service(db)
    success = service.delete(item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="{{ModelName}} not found"
        )
`,
			},
			{
				path: 'app/services/{{service_name}}_service.py',
				content: `from typing import List, Optional
from sqlalchemy.orm import Session

from ..models.{{model_name}} import {{ModelName}}
from ..schemas.{{schema_name}} import {{SchemaName}}Create, {{SchemaName}}Update

class {{ServiceName}}Service:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> List[{{ModelName}}]:
        """Get all {{model_description}}s"""
        return self.db.query({{ModelName}}).offset(skip).limit(limit).all()

    def get_by_id(self, item_id: int) -> Optional[{{ModelName}}]:
        """Get {{model_description}} by ID"""
        return self.db.query({{ModelName}}).filter({{ModelName}}.id == item_id).first()

    def create(self, item_data: {{SchemaName}}Create) -> {{ModelName}}:
        """Create new {{model_description}}"""
        db_item = {{ModelName}}(**item_data.dict())
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def update(self, item_id: int, item_data: {{SchemaName}}Update) -> Optional[{{ModelName}}]:
        """Update {{model_description}}"""
        db_item = self.get_by_id(item_id)
        if not db_item:
            return None

        update_data = item_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_item, field, value)

        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def delete(self, item_id: int) -> bool:
        """Delete {{model_description}}"""
        db_item = self.get_by_id(item_id)
        if not db_item:
            return False

        self.db.delete(db_item)
        self.db.commit()
        return True

    def get_by_criteria(self, **kwargs) -> List[{{ModelName}}]:
        """Get {{model_description}}s by criteria"""
        query = self.db.query({{ModelName}})
        for field, value in kwargs.items():
            if hasattr({{ModelName}}, field) and value is not None:
                query = query.filter(getattr({{ModelName}}, field) == value)
        return query.all()
`,
			},
		],
	},
];

// Go Gin Templates
export const GIN_TEMPLATES: BackendTemplate[] = [
	{
		name: 'gin-handler',
		description: 'Go Gin handler with proper structure',
		framework: ['gin'],
		language: ['go'],
		files: [
			{
				path: 'internal/handlers/{{handler_name}}.go',
				content: `package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"{{module_name}}/internal/models"
	"{{module_name}}/internal/services"
)

type {{HandlerName}}Handler struct {
	service *services.{{ServiceName}}Service
}

func New{{HandlerName}}Handler(service *services.{{ServiceName}}Service) *{{HandlerName}}Handler {
	return &{{HandlerName}}Handler{
		service: service,
	}
}

// Get{{PluralName}} handles GET /{{route_path}}
func (h *{{HandlerName}}Handler) Get{{PluralName}}(c *gin.Context) {
	items, err := h.service.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve {{plural_name}}",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    items,
		"message": "{{PluralName}} retrieved successfully",
	})
}

// Get{{SingularName}} handles GET /{{route_path}}/:id
func (h *{{HandlerName}}Handler) Get{{SingularName}}(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid ID format",
		})
		return
	}

	item, err := h.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve {{singular_name}}",
		})
		return
	}

	if item == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "{{SingularName}} not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    item,
		"message": "{{SingularName}} retrieved successfully",
	})
}

// Create{{SingularName}} handles POST /{{route_path}}
func (h *{{HandlerName}}Handler) Create{{SingularName}}(c *gin.Context) {
	var req models.Create{{ModelName}}Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	item, err := h.service.Create(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create {{singular_name}}",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    item,
		"message": "{{SingularName}} created successfully",
	})
}

// Update{{SingularName}} handles PUT /{{route_path}}/:id
func (h *{{HandlerName}}Handler) Update{{SingularName}}(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid ID format",
		})
		return
	}

	var req models.Update{{ModelName}}Request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	item, err := h.service.Update(uint(id), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update {{singular_name}}",
		})
		return
	}

	if item == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "{{SingularName}} not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    item,
		"message": "{{SingularName}} updated successfully",
	})
}

// Delete{{SingularName}} handles DELETE /{{route_path}}/:id
func (h *{{HandlerName}}Handler) Delete{{SingularName}}(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid ID format",
		})
		return
	}

	err = h.service.Delete(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete {{singular_name}}",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "{{SingularName}} deleted successfully",
	})
}
`,
			},
			{
				path: 'internal/services/{{service_name}}.go',
				content: `package services

import (
	"{{module_name}}/internal/models"
	"{{module_name}}/internal/repositories"
)

type {{ServiceName}}Service struct {
	repo repositories.{{RepositoryName}}Repository
}

func New{{ServiceName}}Service(repo repositories.{{RepositoryName}}Repository) *{{ServiceName}}Service {
	return &{{ServiceName}}Service{
		repo: repo,
	}
}

func (s *{{ServiceName}}Service) GetAll() ([]*models.{{ModelName}}, error) {
	return s.repo.GetAll()
}

func (s *{{ServiceName}}Service) GetByID(id uint) (*models.{{ModelName}}, error) {
	return s.repo.GetByID(id)
}

func (s *{{ServiceName}}Service) Create(req models.Create{{ModelName}}Request) (*models.{{ModelName}}, error) {
	item := &models.{{ModelName}}{
		// Map request fields to model
	}

	return s.repo.Create(item)
}

func (s *{{ServiceName}}Service) Update(id uint, req models.Update{{ModelName}}Request) (*models.{{ModelName}}, error) {
	existingItem, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if existingItem == nil {
		return nil, nil
	}

	// Update fields from request
	// existingItem.Field = req.Field

	return s.repo.Update(existingItem)
}

func (s *{{ServiceName}}Service) Delete(id uint) error {
	return s.repo.Delete(id)
}
`,
			},
		],
	},
];

// Middleware Templates
export const MIDDLEWARE_TEMPLATES: BackendTemplate[] = [
	{
		name: 'auth-middleware',
		description: 'Authentication middleware',
		framework: ['express', 'fastapi', 'gin'],
		language: ['typescript', 'python', 'go'],
		files: [
			{
				path: 'src/middleware/auth.middleware.ts',
				content: `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/auth.errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const auth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }

    next();
  };
};

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check for token in cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
}
`,
				conditions: ['typescript'],
			},
		],
	},
];

// Template processing utilities
export function processBackendTemplate(
	template: string,
	variables: Record<string, string>,
): string {
	let processed = template;

	for (const [key, value] of Object.entries(variables)) {
		const regex = new RegExp(`{{${key}}}`, 'g');
		processed = processed.replace(regex, value);
	}

	return processed;
}

// Case conversion utilities for backend templates
export function toSnakeCase(str: string): string {
	return str
		.replace(/([A-Z])/g, '_$1')
		.toLowerCase()
		.replace(/^_/, '');
}

export function toPascalCase(str: string): string {
	return str.replace(/(?:^|[_-])(\w)/g, (_, char) => char.toUpperCase());
}

export function toCamelCase(str: string): string {
	const pascal = toPascalCase(str);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toKebabCase(str: string): string {
	return str
		.replace(/([A-Z])/g, '-$1')
		.toLowerCase()
		.replace(/^-/, '');
}

export function generateBackendVariables(
	modelName: string,
): Record<string, string> {
	const pascalCase = toPascalCase(modelName);
	const camelCase = toCamelCase(modelName);
	const snakeCase = toSnakeCase(modelName);
	const kebabCase = toKebabCase(modelName);

	return {
		ModelName: pascalCase,
		modelName: camelCase,
		model_name: snakeCase,
		'model-name': kebabCase,
		MODEL_NAME: modelName.toUpperCase().replace(/[-_]/g, '_'),

		ServiceName: pascalCase,
		serviceName: camelCase,
		service_name: snakeCase,

		ControllerName: pascalCase,
		controllerName: camelCase,
		controller_name: snakeCase,

		HandlerName: pascalCase,
		handler_name: snakeCase,

		RepositoryName: pascalCase,
		repository_name: snakeCase,

		SchemaName: pascalCase,
		schema_name: snakeCase,

		// Pluralized versions
		PluralName: `${pascalCase}s`,
		pluralName: `${camelCase}s`,
		plural_name: `${snakeCase}s`,
		'plural-name': `${kebabCase}s`,

		SingularName: pascalCase,
		singular_name: snakeCase,

		// Route paths
		routeName: camelCase,
		route_name: snakeCase,
		routePath: kebabCase,
		route_path: snakeCase,

		// Descriptions
		model_description: modelName.toLowerCase(),
		tags: kebabCase,
	};
}

// Get templates by framework and language
export function getBackendTemplates(
	framework?: string,
	language?: string,
): BackendTemplate[] {
	const allTemplates = [
		...EXPRESS_TEMPLATES,
		...FASTAPI_TEMPLATES,
		...GIN_TEMPLATES,
		...MIDDLEWARE_TEMPLATES,
	];

	return allTemplates.filter((template) => {
		const frameworkMatch = !framework || template.framework.includes(framework);
		const languageMatch = !language || template.language.includes(language);
		return frameworkMatch && languageMatch;
	});
}
