import VendorProfile from "../models/admin.model.js";
import User from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";


// GERENCIAMENTO DE PERFIL DE VENDEDOR

// Criar/Solicitar perfil de vendedor
export const createVendorProfile = async (req, res) => {
  try {
    const { fullName, cpf, dateOfBirth, personalPhoto, rgFrontPhoto, rgBackPhoto, displayName } = req.body;

    // Verificar se já tem perfil de vendedor
    const existingProfile = await VendorProfile.findOne({ userId: req.user._id });
    if (existingProfile) {
      return res.status(400).json({ message: "Você já possui um perfil de vendedor" });
    }

    // Validações
    if (!fullName || !cpf || !dateOfBirth || !personalPhoto || !rgFrontPhoto || !rgBackPhoto) {
      return res.status(400).json({ 
        message: "Nome completo, CPF, data de nascimento e todas as fotos são obrigatórios" 
      });
    }

    // Verificar se CPF já está em uso
    const cpfExists = await VendorProfile.findOne({ cpf });
    if (cpfExists) {
      return res.status(400).json({ message: "CPF já cadastrado" });
    }

    // Verificar idade mínima (18 anos)
    const birthDate = new Date(dateOfBirth);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      return res.status(400).json({ message: "É necessário ter no mínimo 18 anos" });
    }

    // Upload das fotos para Cloudinary
    const [personalPhotoUrl, rgFrontUrl, rgBackUrl] = await Promise.all([
      cloudinary.uploader.upload(personalPhoto, {
        folder: "vendor_verification/personal",
        transformation: [{ width: 800, height: 800, crop: "limit" }]
      }),
      cloudinary.uploader.upload(rgFrontPhoto, {
        folder: "vendor_verification/rg_front",
        transformation: [{ width: 1200, height: 800, crop: "limit" }]
      }),
      cloudinary.uploader.upload(rgBackPhoto, {
        folder: "vendor_verification/rg_back",
        transformation: [{ width: 1200, height: 800, crop: "limit" }]
      })
    ]);

    // Criar perfil de vendedor
    const vendorProfile = await VendorProfile.create({
      userId: req.user._id,
      fullName,
      cpf,
      dateOfBirth,
      personalPhoto: personalPhotoUrl.secure_url,
      rgFrontPhoto: rgFrontUrl.secure_url,
      rgBackPhoto: rgBackUrl.secure_url,
      displayName: displayName || fullName,
      verificationStatus: "pending",
    });

    // Atualizar role do usuário
    const user = await User.findById(req.user._id);
    if (!user.role.includes("vendor")) {
      user.role.push("vendor");
      await user.save();
    }

    res.status(201).json({ 
      message: "Perfil de vendedor criado com sucesso! Aguarde a aprovação.",
      vendorProfile: {
        _id: vendorProfile._id,
        fullName: vendorProfile.fullName,
        displayName: vendorProfile.displayName,
        verificationStatus: vendorProfile.verificationStatus,
      }
    });

  } catch (error) {
    console.log("Erro ao criar perfil de vendedor:", error);
    res.status(500).json({ message: "Erro ao criar perfil de vendedor", error: error.message });
  }
};

// Buscar perfil de vendedor
export const getMyVendorProfile = async (req, res) => {
  try {
    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    res.json({ vendorProfile });

  } catch (error) {
    console.log("Erro ao buscar perfil:", error);
    res.status(500).json({ message: "Erro ao buscar perfil", error: error.message });
  }
};

// Atualizar dados bancários
export const updateBankDetails = async (req, res) => {
  try {
    const { bankName, accountType, accountNumber, agency, pixKey } = req.body;

    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    if (vendorProfile.verificationStatus !== "approved") {
      return res.status(403).json({ message: "Seu perfil precisa estar aprovado" });
    }

    vendorProfile.bankDetails = {
      bankName: bankName || vendorProfile.bankDetails.bankName,
      accountType: accountType || vendorProfile.bankDetails.accountType,
      accountNumber: accountNumber || vendorProfile.bankDetails.accountNumber,
      agency: agency || vendorProfile.bankDetails.agency,
      pixKey: pixKey || vendorProfile.bankDetails.pixKey,
    };

    await vendorProfile.save();

    res.json({ 
      message: "Dados bancários atualizados com sucesso",
      bankDetails: vendorProfile.bankDetails 
    });

  } catch (error) {
    console.log("Erro ao atualizar dados bancários:", error);
    res.status(500).json({ message: "Erro ao atualizar dados bancários", error: error.message });
  }
};

// Atualizar nome de exibição
export const updateDisplayName = async (req, res) => {
  try {
    const { displayName } = req.body;

    if (!displayName || displayName.trim() === "") {
      return res.status(400).json({ message: "Nome de exibição é obrigatório" });
    }

    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    vendorProfile.displayName = displayName.trim();
    await vendorProfile.save();

    res.json({ 
      message: "Nome de exibição atualizado com sucesso",
      displayName: vendorProfile.displayName 
    });

  } catch (error) {
    console.log("Erro ao atualizar nome:", error);
    res.status(500).json({ message: "Erro ao atualizar nome", error: error.message });
  }
};


// GERENCIAMENTO DE PRODUTOS

// Criar novo produto
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category, produtoV, stock, isFeatured } = req.body;

    // Validações
    if (!name || !description || !price || !image || !category || !produtoV) {
      return res.status(400).json({ 
        message: "Nome, descrição, preço, imagem, categoria e tipo de produto são obrigatórios" 
      });
    }

    if (price < 0) {
      return res.status(400).json({ message: "Preço não pode ser negativo" });
    }

    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    if (vendorProfile.verificationStatus !== "approved") {
      return res.status(403).json({ 
        message: "Seu perfil precisa estar aprovado para adicionar produtos" 
      });
    }

    // Upload da imagem
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: "products",
      transformation: [
        { width: 800, height: 800, crop: "limit" },
        { quality: "auto", fetch_format: "auto" }
      ]
    });

    const productData = {
      name,
      description,
      price,
      image: uploadResponse.secure_url,
      category,
      produtoV,
      stock: stock || 0,
      isFeatured: isFeatured || false,
    };

    const newProduct = await vendorProfile.addProduct(productData);

    res.status(201).json({ 
      message: "Produto criado com sucesso", 
      product: newProduct 
    });

  } catch (error) {
    console.log("Erro ao criar produto:", error);
    res.status(500).json({ message: "Erro ao criar produto", error: error.message });
  }
};

// Buscar meus produtos
export const getMyProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, produtoV, isActive, search } = req.query;

    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    let products = vendorProfile.products;

    // Filtros
    if (category) {
      products = products.filter(p => p.category === category);
    }

    if (produtoV) {
      products = products.filter(p => p.produtoV === produtoV);
    }

    if (isActive !== undefined) {
      products = products.filter(p => p.isActive === (isActive === "true"));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por data
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      products: paginatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(products.length / limit),
        totalProducts: products.length,
        hasNextPage: endIndex < products.length,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar produtos:", error);
    res.status(500).json({ message: "Erro ao buscar produtos", error: error.message });
  }
};

// Buscar produto por ID
export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    const product = vendorProfile.products.id(productId);

    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    res.json({ product });

  } catch (error) {
    console.log("Erro ao buscar produto:", error);
    res.status(500).json({ message: "Erro ao buscar produto", error: error.message });
  }
};

// Atualizar produto
export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, description, price, image, category, produtoV, stock, isFeatured, isActive } = req.body;

    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    const product = vendorProfile.products.id(productId);

    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    // Atualizar imagem se fornecida
    let imageUrl = product.image;
    if (image && image !== product.image) {
      const publicId = product.image.split('/').pop().split(".")[0];
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
      } catch (error) {
        console.log("Erro ao deletar imagem antiga:", error);
      }

      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
        transformation: [
          { width: 800, height: 800, crop: "limit" },
          { quality: "auto", fetch_format: "auto" }
        ]
      });
      imageUrl = uploadResponse.secure_url;
    }

    const updateData = {
      name: name || product.name,
      description: description || product.description,
      price: price !== undefined ? price : product.price,
      image: imageUrl,
      category: category || product.category,
      produtoV: produtoV || product.produtoV,
      stock: stock !== undefined ? stock : product.stock,
      isFeatured: isFeatured !== undefined ? isFeatured : product.isFeatured,
      isActive: isActive !== undefined ? isActive : product.isActive,
    };

    const updatedProduct = await vendorProfile.updateProduct(productId, updateData);

    res.json({ 
      message: "Produto atualizado com sucesso", 
      product: updatedProduct 
    });

  } catch (error) {
    console.log("Erro ao atualizar produto:", error);
    res.status(500).json({ message: "Erro ao atualizar produto", error: error.message });
  }
};

// Deletar produto (soft delete)
export const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    await vendorProfile.deleteProduct(productId);

    res.json({ message: "Produto desativado com sucesso" });

  } catch (error) {
    console.log("Erro ao deletar produto:", error);
    res.status(500).json({ message: error.message || "Erro ao deletar produto" });
  }
};

// Atualizar estoque
export const updateStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { stock } = req.body;

    if (stock === undefined || stock < 0) {
      return res.status(400).json({ message: "Estoque inválido" });
    }

    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    const product = vendorProfile.products.id(productId);

    if (!product) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    product.stock = stock;
    await vendorProfile.save();

    res.json({ 
      message: "Estoque atualizado com sucesso", 
      product 
    });

  } catch (error) {
    console.log("Erro ao atualizar estoque:", error);
    res.status(500).json({ message: "Erro ao atualizar estoque", error: error.message });
  }
};


// PRODUTOS PÚBLICOS (Para clientes)

// Buscar produtos de um vendedor específico
export const getVendorProducts = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { page = 1, limit = 20, category, produtoV, search } = req.query;

    const vendorProfile = await VendorProfile.findOne({ 
      userId: vendorId,
      verificationStatus: "approved",
      isActive: true 
    });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Vendedor não encontrado" });
    }

    let products = vendorProfile.products.filter(p => p.isActive);

    // Filtros
    if (category) {
      products = products.filter(p => p.category === category);
    }

    if (produtoV) {
      products = products.filter(p => p.produtoV === produtoV);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por destaque e data
    products.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      vendor: {
        displayName: vendorProfile.displayName,
        rating: vendorProfile.rating,
        totalReviews: vendorProfile.totalReviews,
      },
      products: paginatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(products.length / limit),
        totalProducts: products.length,
        hasNextPage: endIndex < products.length,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar produtos do vendedor:", error);
    res.status(500).json({ message: "Erro ao buscar produtos", error: error.message });
  }
};

// Buscar todos os produtos da plataforma
export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, produtoV, search, isFeatured } = req.query;

    const vendorProfiles = await VendorProfile.find({ 
      verificationStatus: "approved",
      isActive: true 
    });

    let allProducts = [];

    // Coletar produtos ativos de todos os vendedores
    vendorProfiles.forEach(profile => {
      const activeProducts = profile.products
        .filter(p => p.isActive)
        .map(p => ({
          ...p.toObject(),
          vendor: {
            id: profile.userId,
            displayName: profile.displayName,
            rating: profile.rating,
          }
        }));
      allProducts = allProducts.concat(activeProducts);
    });

    // Filtros
    if (category) {
      allProducts = allProducts.filter(p => p.category === category);
    }

    if (produtoV) {
      allProducts = allProducts.filter(p => p.produtoV === produtoV);
    }

    if (isFeatured === "true") {
      allProducts = allProducts.filter(p => p.isFeatured);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      allProducts = allProducts.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por destaque e data
    allProducts.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Paginação
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedProducts = allProducts.slice(startIndex, endIndex);

    res.json({
      products: paginatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(allProducts.length / limit),
        totalProducts: allProducts.length,
        hasNextPage: endIndex < allProducts.length,
        hasPrevPage: page > 1,
      }
    });

  } catch (error) {
    console.log("Erro ao buscar produtos:", error);
    res.status(500).json({ message: "Erro ao buscar produtos", error: error.message });
  }
};

// Buscar detalhes de um produto
export const getProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;

    const vendorProfiles = await VendorProfile.find({ 
      verificationStatus: "approved",
      isActive: true 
    });

    let foundProduct = null;
    let vendorInfo = null;

    for (const profile of vendorProfiles) {
      const product = profile.products.id(productId);
      if (product && product.isActive) {
        foundProduct = product;
        vendorInfo = {
          id: profile.userId,
          displayName: profile.displayName,
          rating: profile.rating,
          totalReviews: profile.totalReviews,
          totalSales: profile.totalSales,
        };
        
        // Incrementar views
        product.views += 1;
        await profile.save();
        break;
      }
    }

    if (!foundProduct) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }

    res.json({ 
      product: foundProduct, 
      vendor: vendorInfo 
    });

  } catch (error) {
    console.log("Erro ao buscar detalhes do produto:", error);
    res.status(500).json({ message: "Erro ao buscar produto", error: error.message });
  }
};


// ESTATÍSTICAS DO VENDEDOR
// Buscar estatísticas do vendedor
export const getVendorStats = async (req, res) => {
  try {
    const vendorProfile = await VendorProfile.findOne({ userId: req.user._id });

    if (!vendorProfile) {
      return res.status(404).json({ message: "Perfil de vendedor não encontrado" });
    }

    const stats = {
      totalProducts: vendorProfile.totalProducts,
      totalSales: vendorProfile.totalSales,
      totalEarnings: vendorProfile.totalEarnings,
      totalWithdrawals: vendorProfile.totalWithdrawals,
      balance: vendorProfile.balance,
      rating: vendorProfile.rating,
      totalReviews: vendorProfile.totalReviews,
    };

    res.json({ stats });

  } catch (error) {
    console.log("Erro ao buscar estatísticas:", error);
    res.status(500).json({ message: "Erro ao buscar estatísticas", error: error.message });
  }
};