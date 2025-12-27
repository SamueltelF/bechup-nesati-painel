import redis from "../db/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}); 

    res.json({ products });
  } catch (error) {
    console.log("Error in getAllProducts controller:", error);
    res.status(500).json({
      message: "Internal Server Error while fetching products",
      error,
    });
  }
};

// Buscar todos os produtos do vendedor
export const getMyProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, produtoV, isActive, search } = req.query

    const adminProfile = await AdminProfile.findOne({ userId: req.user._id })

    if (!adminProfile) {
      return res.status(404).json({message: "Perfil de vendedor não encontrado"})
    }

    let products = adminProfile.products

    // Filtros
    if (category) {
      products = products.filter(p => p.category === category)
    }

    if (produtoV) {
      products = products.filter(p => p.produtoV === produtoV)
    }

    if (isActive !== undefined) {
      products = products.filter(p => p.isActive === (isActive === "true"))
    }

    if (search) {
      const searchLower = search.toLowerCase()
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      )
    }

    
    products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedProducts = products.slice(startIndex, endIndex)

    res.json({
      products: paginatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(products.length / limit),
        totalProducts: products.length,
        hasNextPage: endIndex < products.length,
        hasPrevPage: page > 1,
      }
    })

  } catch (error) {
    console.log("Erro ao buscar produtos:", error)
    res.status(500).json({message: "Erro ao buscar produtos", error: error.message})
  }
}

export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featured_products");

    if (featuredProducts) {
      return res.json({ products: JSON.parse(featuredProducts) });
    }

   
    featuredProducts = await Product.find({ isFeatured: true }).lean(); 

    if (!featuredProducts) {
      return res.status(404).json({ message: "No featured products found" });
    }

    await redis.set("featured_products", JSON.stringify(featuredProducts));

    res.json({ products: featuredProducts });
  } catch (error) {
    console.log("Error in getFeaturedProducts controller:", error);
    res.status(500).json({
      message: "Internal Server Error while fetching featured products",
      error,
    });
  }
};

export const createProduct = async (req, res) => {
  const { name, price, description, image, category, produtoV, isFeatured } = req.body;

  try {
    let cloudinaryResponse = null;

    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      });
    }

    const product = await Product.create({
      name,
      price,
      description,
      image: cloudinaryResponse?.secure_url || "",
      category,
      produtoV,
      isFeatured,
    });

    res.status(201).json({ product });
  } catch (error) {
    console.log("Error in createProduct controller:", error);
    res.status(500).json({
      message: "Internal Server Error while creating product",
      error,
    });
  }
};

export const getRecommendedProducts = async (req, res) => {
  try {
    
    const recommendedProducts = await Product.aggregate([
      { $sample: { size: 4 } },
      { $project: { _id: 1, name: 1, description: 1, price: 1, image: 1 } },
    ]);

    if (!recommendedProducts) {
      return res.status(404).json({ message: "No recommended products found" });
    }

    res.status(200).json({ products: recommendedProducts });
  } catch (error) {
    console.log("Error in getRecommendedProducts controller:", error);
    res.status(500).json({
      message: "Internal Server Error while fetching recommended products",
      error,
    });
  }
};

export const getProductByCategory = async (req, res) => {
  const { category } = req.params;

  try {
    const products = await Product.find({ category: category });

    if (!products) {
      return res
        .status(404)
        .json({ message: "No products found in this category" });
    }

    res.json({ products });
  } catch (error) {
    console.log("Error in getProductByCategory controller:", error);
    res.status(500).json({
      message: "Internal Server Error while fetching products by category",
      error,
    });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (product) {
      product.isFeatured = !product.isFeatured;
      const updatedProduct = await product.save();
      await updateFeaturedProductsCache(updatedProduct);
      res.json({ updatedProduct });
    } else {
      res.status(404).json({ message: "Product not found" });
    }
  } catch (error) {
    console.log("Error in toggleFeaturedProduct controller:", error);
    res.status(500).json({
      message: "Internal Server Error while toggling featured product",
      error,
    });
  }
};

const updateFeaturedProductsCache = async (updatedProduct) => {
  try {
    const featuredProducts = await Product.find({ isFeatured: true }).lean();

    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch (error) {
    console.log("Error in updateFeaturedProductsCache:", error);
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (product.imageUrl) {
      
      const publicId = product.imageUrl.split("/").pop().split(".")[0]; 
      try {
        await cloudinary.uploader.destroy(publicId);
        console.log("Image deleted from Cloudinary");
      } catch (error) {
        console.log(
          "Error in deleteProduct controller while deleting image from Cloudinary:",
          error
        );
        return res.status(500).json({
          message: "Internal Server Error while deleting image from Cloudinary",
          error,
        });
      }
    }
    await product.deleteOne();

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.log("Error in deleteProduct controller:", error);
    res.status(500).json({
      message: "Internal Server Error while deleting product",
      error,
    });
  }
};
