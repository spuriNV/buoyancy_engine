export async function getDataController(req: any, res: any) {
    try {
      const { db } = req.app;
  
      const result = await db.collection('mission_data').find().toArray();
  
      res.status(200).json({
        message: "Data retrieved",
        customers: result
      });
  
    }
    catch(error) {
      res.status(500).json({ error: error.toString() });
    }
  }