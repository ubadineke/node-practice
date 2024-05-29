const Tour = require('./../models/tourModel.js')
const APIFeatures = require('./../utils/apiFeatures')

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5'
    req.query.sort = '-ratingsAverage,price'
    req.query.fields = 'name,price,ratingsAverage'
    next();
}


exports.getAllTours = async (req, res) => {
    try{
    //BUILD QUERY
    // 1A) Filtering
    // const queryObj = { ...req.query }
    // const excludedFields = ['page', 'sort', 'limit', 'fields'];
    // excludedFields.forEach(el => delete queryObj[el]);
    
    

    // // 1B) Advanced filtering
    // let queryStr = JSON.stringify(queryObj);
    // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    // let query = Tour.find(JSON.parse(queryStr));


    // 2) Sorting
    // if(req.query.sort){
    //     console.log(req.query.sort)
    //     const sortBy = req.query.sort.split(',').join(' ')
    //     console.log(sortBy)
    //     query = query.sort(sortBy)
    // } else {
    //     query = query.sort('-createdAt')
    // }

    // 3) Field Limiting
    // if(req.query.fields){
    //     const fields = req.query.fields.split(',').join(' ')
    //     query = query.select(fields)
    // } else {
    //     query = query.select('-__v')
    // }

    // 4) Pagination
    // const page = req.query.page * 1 || 1
    // const limit = req.query.limit * 1 || 10
    // const skip = (page - 1) * limit;

    // query = query.skip(skip).limit(limit)

    // if(req.query.page){
    //     const numTours = await Tour.countDocument();
    //     if(skip >= numTours) throw new Error('This page does not exist')
    // }
    // EXECUTE QUERY
    const features = new APIFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate();
    const tours = await features.query;

    //SEND RESPONSE

    res.status(200).json({
      status: 'success',
      results: tours.length, //returns count of items sent back
       data: {
         tours
       }
    })
  } catch(err){
    res.status(404).json({
        status:'fail',
        message: err
    })
  }
};

   // const query = await Tour.find({
    //     duration: 5,
    //     difficulty: 'easy'
    // });

    // const tours = await Tour.find()
    //     .where('duration')
    //     .equals(5)    
    //     .where('difficulty')
    //     .equals('easy');

exports.getTour = async (req, res) => {
    try{
        const tour = await Tour.findById(req.params.id)
        res.status(200).json({
            status: 'success',
            data:{
                tour
            }
            })
    } catch (err){
        res.status(404).json({
            status:'fail',
            message: err
        })
    }
}
exports.createTour = async (req, res) => {
    try{

    const newTour = await Tour.create(req.body)
    res.status(201).json({
        status:'success',
        data:{
            tour: newTour
        }
    });    
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        })
    }
};

exports.updateTour = async(req, res) => {
    try {
        const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
          
        })

        res.status(200).json({
            status: 'success',
            data:{
              tour
          }
        })
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        })
    }
    
}

exports.deleteTour = async (req, res) => {
    try{
        await Tour.findByIdAndDelete(req.params.id)
        res.status(200).json({
            status: 'success',
            message:"Deleted successfully",
            data: null
        })
    } catch (err){
        res.status(404).json({
            status: 'fail',
            message: err
        })
    }
    }

exports.getTourStats = async (req, res) => {
    try {
        const stats = await Tour.aggregate([
            {
                $match: { ratingsAverage: { $gte: 4.5 } }
            },
            {
                $group: {
                _id: { $toUpper: '$difficulty' },
                numTours: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity'},
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price'},
                minPrice: { $min: '$price'},
                maxPrice: { $max: '$price'} 
                }
            },
            {
                $sort: { avgPrice: 1}
            },
            {
                $match: { _id: { $ne: 'EASY' }}
            }
        ]);

        res.status (200).json({
            status:'success',
            data: { 
                stats
            }
        });
    } catch (err){
        res.status(404).json({
            status: 'fail',
            message: err
        }) 
    }
}

exports.getMonthlyPlan = async (req, res) => {
    try{
        const year = req.params.year * 1;
        console.log(year)
        const plan = await Tour.aggregate([
            {
                $unwind: '$startDates'
            },
            {
                $match: {
                    startDates: {
                        $gte: new Date(`${year}-01-01`),
                        $lte: new Date(`${year}-12-31`)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$startDates' },
                    numTourStarts: { $sum: 1 },
                    tours: { $push: '$name'}
                }
            },
            {
                $addFields: { month: '$_id' }
            },
            {
                $project: {
                    _id: 0
                }
            },
            {
                $sort: { numTourStarts: -1 }
            },
            {
                $limit: 12
            }
        ]);
        res.status (200).json({
            status:'success',
            data: {
                plan
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        }) 
    }
}