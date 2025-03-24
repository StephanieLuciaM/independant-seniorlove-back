// Middleware for error handling
export const errorHandler = (controller) => async (req, res, next) =>{
  try {
    await controller(req,res,next);
  } catch (err) {
    if (err.name === 'UnauthorizedError') {
      console.log(err, '<< 401 UNAUTHORIZED');
      res.status(401).json({err: 'Invalid token'});
    } else if (err.name === 'NotFoundError') {
      console.log(err, '<< 404 NOT FOUND');
      res.status(404).json({err: 'Not found'});
    }else if(err.name === 'ForbiddenError'){
      console.log(err,'<< 403 FORBIDDEN ERROR');
      res.status(403).json({err: 'forbidden error'});
    } else {
      console.log(err, '<< 500 INTERNAL SERVER ERROR');
      res.status(500).json({err: 'Something went wrong'});
    }
  }
};
